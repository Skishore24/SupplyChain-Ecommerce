"""
Data Aggregation Service
========================
Builds pre-computed daily aggregates from raw order/inventory data.
All jobs are idempotent — safe to re-run without duplicate data.
"""
from datetime import datetime, timezone, date, timedelta
from typing import Optional
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.inventory import (
    DailySalesAggregate,
    InventorySnapshot,
    InventoryTransaction,
    InventoryTransactionType,
)

logger = logging.getLogger(__name__)


class AggregationService:
    """
    Idempotent daily aggregation jobs.
    Creates/updates DailySalesAggregate and InventorySnapshot records.
    """

    def aggregate_daily_sales(
        self,
        db: Session,
        target_date: Optional[date] = None,
        days_back: int = 1,
    ) -> int:
        """
        Aggregate sales for target_date (default: yesterday).
        Returns count of upserted records.
        """
        if target_date is None:
            target_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).date()

        logger.info(f"[aggregation] Aggregating daily sales for {target_date}")

        # Get all products that had orders on this date
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        sales_rows = (
            db.query(
                OrderItem.product_id,
                func.sum(OrderItem.quantity).label("units_sold"),
                func.count(func.distinct(OrderItem.order_id)).label("order_count"),
                func.sum(OrderItem.total_price).label("revenue"),
                func.avg(OrderItem.unit_price).label("avg_price"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                OrderItem.product_id.isnot(None),
                Order.status != OrderStatus.CANCELLED,
            )
            .group_by(OrderItem.product_id)
            .all()
        )

        upsert_count = 0
        for row in sales_rows:
            existing = (
                db.query(DailySalesAggregate)
                .filter(
                    DailySalesAggregate.product_id == row.product_id,
                    DailySalesAggregate.sale_date == target_date,
                )
                .first()
            )
            if existing:
                existing.units_sold = int(row.units_sold or 0)
                existing.order_count = int(row.order_count or 0)
                existing.revenue = float(row.revenue or 0)
                existing.avg_selling_price = float(row.avg_price or 0)
                existing.updated_at = datetime.now(timezone.utc)
            else:
                # Get closing stock from product
                product = db.query(Product).filter(Product.id == row.product_id).first()
                stock_eod = product.stock_quantity if product else None

                agg = DailySalesAggregate(
                    product_id=row.product_id,
                    sale_date=target_date,
                    units_sold=int(row.units_sold or 0),
                    order_count=int(row.order_count or 0),
                    revenue=float(row.revenue or 0),
                    avg_selling_price=float(row.avg_price or 0),
                    stock_at_eod=stock_eod,
                )
                db.add(agg)
            upsert_count += 1

        db.commit()
        logger.info(f"[aggregation] Upserted {upsert_count} daily sales records for {target_date}")
        return upsert_count

    def aggregate_date_range(
        self,
        db: Session,
        start_date: date,
        end_date: date,
    ) -> int:
        """
        Aggregate sales for a date range. Used for seeding historical data.
        """
        total = 0
        current = start_date
        while current <= end_date:
            total += self.aggregate_daily_sales(db, target_date=current)
            current += timedelta(days=1)
        return total

    def create_inventory_snapshot(
        self,
        db: Session,
        target_date: Optional[date] = None,
    ) -> int:
        """
        Create daily inventory snapshots for all active products.
        Calculates movements from InventoryTransactions.
        Returns count of snapshots created/updated.
        """
        if target_date is None:
            target_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()

        logger.info(f"[aggregation] Creating inventory snapshots for {target_date}")

        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        products = db.query(Product).filter(Product.is_active == True).all()
        count = 0

        for product in products:
            # Sum transactions for this day by type
            tx_query = db.query(
                InventoryTransaction.transaction_type,
                func.sum(InventoryTransaction.quantity).label("total_qty"),
            ).filter(
                InventoryTransaction.product_id == product.id,
                InventoryTransaction.created_at >= start_dt,
                InventoryTransaction.created_at <= end_dt,
            ).group_by(InventoryTransaction.transaction_type).all()

            tx_map = {row.transaction_type: int(row.total_qty or 0) for row in tx_query}

            units_received = tx_map.get(InventoryTransactionType.RECEIPT, 0)
            units_sold = abs(tx_map.get(InventoryTransactionType.SALE, 0))
            units_returned = tx_map.get(InventoryTransactionType.RETURN, 0)
            units_damaged = abs(tx_map.get(InventoryTransactionType.DAMAGE, 0))
            units_adjusted = tx_map.get(InventoryTransactionType.ADJUSTMENT, 0)

            closing_stock = product.stock_quantity

            existing = (
                db.query(InventorySnapshot)
                .filter(
                    InventorySnapshot.product_id == product.id,
                    InventorySnapshot.snapshot_date == target_date,
                )
                .first()
            )

            if existing:
                existing.closing_stock = closing_stock
                existing.units_sold = units_sold
                existing.units_received = units_received
                existing.units_returned = units_returned
                existing.units_damaged = units_damaged
                existing.units_adjusted = units_adjusted
            else:
                snapshot = InventorySnapshot(
                    product_id=product.id,
                    snapshot_date=target_date,
                    opening_stock=closing_stock + units_sold - units_received - units_returned + units_damaged,
                    closing_stock=closing_stock,
                    units_sold=units_sold,
                    units_received=units_received,
                    units_returned=units_returned,
                    units_damaged=units_damaged,
                    units_adjusted=units_adjusted,
                )
                db.add(snapshot)
            count += 1

        db.commit()
        logger.info(f"[aggregation] Created/updated {count} inventory snapshots for {target_date}")
        return count

    def record_sale_transaction(
        self,
        db: Session,
        product_id: int,
        quantity: int,
        order_id: Optional[int] = None,
        created_by_id: Optional[int] = None,
    ) -> InventoryTransaction:
        """
        Record a sale inventory transaction. Called when an order is confirmed.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None

        stock_before = product.stock_quantity
        tx = InventoryTransaction(
            product_id=product_id,
            transaction_type=InventoryTransactionType.SALE,
            quantity=-quantity,  # negative = stock reduction
            stock_before=stock_before,
            stock_after=stock_before - quantity,
            reference_type="order",
            reference_id=order_id,
            created_by_id=created_by_id,
        )
        db.add(tx)
        return tx

    def record_receipt_transaction(
        self,
        db: Session,
        product_id: int,
        quantity: int,
        purchase_order_id: Optional[int] = None,
        created_by_id: Optional[int] = None,
    ) -> InventoryTransaction:
        """
        Record a stock receipt transaction. Called when a PO is received.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None

        stock_before = product.stock_quantity
        tx = InventoryTransaction(
            product_id=product_id,
            transaction_type=InventoryTransactionType.RECEIPT,
            quantity=quantity,  # positive = stock increase
            stock_before=stock_before,
            stock_after=stock_before + quantity,
            reference_type="purchase_order",
            reference_id=purchase_order_id,
            created_by_id=created_by_id,
        )
        db.add(tx)
        product.stock_quantity = stock_before + quantity
        return tx

    def record_adjustment_transaction(
        self,
        db: Session,
        product_id: int,
        new_quantity: int,
        notes: Optional[str] = None,
        created_by_id: Optional[int] = None,
    ) -> InventoryTransaction:
        """
        Record a manual stock adjustment.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None

        stock_before = product.stock_quantity
        delta = new_quantity - stock_before

        tx = InventoryTransaction(
            product_id=product_id,
            transaction_type=InventoryTransactionType.ADJUSTMENT,
            quantity=delta,
            stock_before=stock_before,
            stock_after=new_quantity,
            reference_type="manual",
            notes=notes,
            created_by_id=created_by_id,
        )
        db.add(tx)
        return tx


aggregation_service = AggregationService()
