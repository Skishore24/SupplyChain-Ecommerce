"""
AI Supply Chain Intelligence — Demo Data Seeder
================================================
Populates realistic demo data for the entire AI platform:
- 5 enterprise suppliers with historical metrics
- Supplier-Product sourcing links (MOQ, lead times, pricing)
- 15 historical purchase orders with completed receipts
- 90 days of DailySalesAggregate time-series for ML demand forecasting
- 2 standard supply chain knowledge base SOPs (RAG indexed)
- Initial customer intelligence segmentation, anomalies, and reorder recommendations

All demo records have is_demo=True for clean identification and lifecycle management.
"""
import os
import sys
from datetime import datetime, timezone, timedelta, date
import random
import numpy as np

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.models.supplier import (
    Supplier,
    SupplierProduct,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    SupplierAvailability,
)
from app.models.inventory import (
    InventoryTransaction,
    InventoryTransactionType,
    InventorySnapshot,
    DailySalesAggregate,
)
from app.models.ai_models import (
    KnowledgeDocument,
    KnowledgeChunk,
    DocumentTypeEnum,
    DocumentStatusEnum,
)
from app.ai.procurement.supplier_ranking import calculate_supplier_metrics
from app.ai.procurement.reorder import generate_reorder_recommendations
from app.ai.customer_intelligence.segmentation import compute_all_segments
from app.ai.customer_intelligence.churn import compute_all_risks
from app.ai.anomaly.detector import anomaly_detector
from app.ai.rag.retriever import index_document


def run_seed():
    db = SessionLocal()
    print("================================================================")
    print("[AI] SHOPERA AI SUPPLY CHAIN - DEMO SEEDING STARTED")
    print("================================================================")

    now = datetime.now(timezone.utc)

    # 1. Seed Suppliers
    # -----------------------------------------------------------------
    print("--> Checking / seeding suppliers...")
    suppliers_data = [
        {
            "name": "Nexus Global Sourcing",
            "company": "Nexus Technologies Pvt Ltd",
            "contact_person": "Vikram Malhotra",
            "email": "procurement@nexus-sourcing.com",
            "phone": "+91 98200 12345",
            "city": "Bengaluru",
            "country": "India",
            "payment_terms": "Net 30",
            "min_order_value": 25000.0,
            "avg_lead_time_days": 5.5,
        },
        {
            "name": "Apex Apparel Manufacturing",
            "company": "Apex Textiles Ltd",
            "contact_person": "Pooja Sharma",
            "email": "orders@apextextiles.in",
            "phone": "+91 98111 23456",
            "city": "Tirupur",
            "country": "India",
            "payment_terms": "Net 45",
            "min_order_value": 15000.0,
            "avg_lead_time_days": 9.0,
        },
        {
            "name": "Zenith Precision Logistics",
            "company": "Zenith Industrial Supplies",
            "contact_person": "Rajesh Nair",
            "email": "supply@zenithprecision.com",
            "phone": "+91 98450 34567",
            "city": "Chennai",
            "country": "India",
            "payment_terms": "Net 15",
            "min_order_value": 30000.0,
            "avg_lead_time_days": 4.0,
        },
        {
            "name": "Starlight Footwear Partners",
            "company": "Starlight Craft Leatherworks",
            "contact_person": "Sunita Verma",
            "email": "distribution@starlightcraft.com",
            "phone": "+91 98765 45678",
            "city": "Agra",
            "country": "India",
            "payment_terms": "Net 60",
            "min_order_value": 20000.0,
            "avg_lead_time_days": 12.0,
        },
        {
            "name": "Vanguard Consumer Goods",
            "company": "Vanguard Supply Group",
            "contact_person": "Arun Kulkarni",
            "email": "fulfillment@vanguardgroup.in",
            "phone": "+91 99200 56789",
            "city": "Mumbai",
            "country": "India",
            "payment_terms": "Net 30",
            "min_order_value": 10000.0,
            "avg_lead_time_days": 7.0,
        },
    ]

    seeded_suppliers = []
    for s_data in suppliers_data:
        supplier = db.query(Supplier).filter(Supplier.name == s_data["name"]).first()
        if not supplier:
            supplier = Supplier(**s_data, is_demo=True, is_active=True)
            db.add(supplier)
            db.flush()
        seeded_suppliers.append(supplier)
    db.commit()
    print(f"[OK] {len(seeded_suppliers)} suppliers active.")

    # 2. Link Suppliers to Products
    # -----------------------------------------------------------------
    print("--> Checking / linking products to suppliers...")
    products = db.query(Product).filter(Product.is_active == True).all()
    if not products:
        print("[WARN] No products found in database. Please run initial storefront seed first.")
        db.close()
        return

    from app.models.user import UserRole
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    admin_id = admin_user.id if admin_user else None

    for i, prod in enumerate(products):
        # Pick 2 suppliers for each product (primary and secondary)
        primary_sup = seeded_suppliers[i % len(seeded_suppliers)]
        secondary_sup = seeded_suppliers[(i + 1) % len(seeded_suppliers)]

        prod_price = float(prod.price or 1000.0)

        # Primary link
        existing_p = (
            db.query(SupplierProduct)
            .filter(SupplierProduct.product_id == prod.id, SupplierProduct.supplier_id == primary_sup.id)
            .first()
        )
        if not existing_p:
            sp1 = SupplierProduct(
                supplier_id=primary_sup.id,
                product_id=prod.id,
                supplier_sku=f"VEND-{primary_sup.id}-{prod.id}",
                supplier_price=round(prod_price * 0.55, 2),
                moq=random.choice([5, 10, 20]),
                lead_time_days=int(primary_sup.avg_lead_time_days or 7),
                priority=1,
                availability=SupplierAvailability.IN_STOCK,
            )
            db.add(sp1)

        # Secondary link
        existing_s = (
            db.query(SupplierProduct)
            .filter(SupplierProduct.product_id == prod.id, SupplierProduct.supplier_id == secondary_sup.id)
            .first()
        )
        if not existing_s:
            sp2 = SupplierProduct(
                supplier_id=secondary_sup.id,
                product_id=prod.id,
                supplier_sku=f"VEND-{secondary_sup.id}-{prod.id}",
                supplier_price=round(prod_price * 0.60, 2),
                moq=random.choice([10, 25]),
                lead_time_days=int(secondary_sup.avg_lead_time_days or 10) + 2,
                priority=2,
                availability=SupplierAvailability.IN_STOCK,
            )
            db.add(sp2)

    db.commit()
    print("[OK] Products linked to primary and secondary suppliers.")

    # 3. Seed Completed Purchase Order History (for actual vendor score calculation)
    # -----------------------------------------------------------------
    print("--> Seeding historical purchase orders...")
    po_count = db.query(PurchaseOrder).count()
    if po_count < 10:
        for idx in range(12):
            sup = seeded_suppliers[idx % len(seeded_suppliers)]
            target_prod = products[idx % len(products)]

            order_qty = random.randint(20, 80)
            unit_cost = round(float(target_prod.price or 500.0) * 0.55, 2)
            total_amt = round(order_qty * unit_cost, 2)

            days_ago = (12 - idx) * 7 + random.randint(1, 4)
            submitted = now - timedelta(days=days_ago)
            lead_days = random.randint(4, 10)
            expected = submitted + timedelta(days=7)
            received = submitted + timedelta(days=lead_days)

            po = PurchaseOrder(
                po_number=f"PO-DEMO-{1000 + idx}",
                supplier_id=sup.id,
                status=PurchaseOrderStatus.RECEIVED,
                subtotal=total_amt,
                shipping_cost=500.0,
                total_amount=total_amt + 500.0,
                notes="Historical demo replenishment order",
                created_by_id=admin_id,
                approved_by_id=admin_id,
                is_demo=True,
                created_at=submitted,
                submitted_at=submitted,
                expected_delivery_at=expected,
                received_at=received,
            )
            db.add(po)
            db.flush()

            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=target_prod.id,
                product_name=target_prod.name,
                sku=target_prod.sku or f"SKU-{target_prod.id}",
                quantity_ordered=order_qty,
                quantity_received=order_qty,
                unit_cost=unit_cost,
                total_cost=total_amt,
            )
            db.add(po_item)

        db.commit()
        print("[OK] Seeded 12 historical completed purchase orders.")

        # Recalculate metrics for all suppliers
        for s in seeded_suppliers:
            calculate_supplier_metrics(db, s.id)
        print("[OK] Supplier reliability scores computed from PO history.")

    # 4. Backfill 90 Days of DailySalesAggregate (for ML Forecasting)
    # -----------------------------------------------------------------
    print("--> Seeding 90 days of daily sales aggregates for forecasting...")
    agg_count = db.query(DailySalesAggregate).count()
    if agg_count < 200:
        for prod in products[:15]:  # Focus on top 15 products
            base_sales = random.randint(3, 10)
            price = float(prod.price or 50.0)

            for day_offset in range(90, 0, -1):
                d = (now - timedelta(days=day_offset)).date()

                # Seasonality: higher on weekends (day of week 5, 6)
                day_of_week = d.weekday()
                weekend_boost = 1.4 if day_of_week in [5, 6] else 1.0

                # Slight random noise + trend
                trend = 1.0 + ((90 - day_offset) * 0.002)
                qty = max(0, int(np.random.poisson(base_sales * weekend_boost * trend)))
                revenue = round(qty * price, 2)

                agg = (
                    db.query(DailySalesAggregate)
                    .filter(DailySalesAggregate.product_id == prod.id, DailySalesAggregate.sale_date == d)
                    .first()
                )
                if not agg:
                    agg = DailySalesAggregate(
                        product_id=prod.id,
                        sale_date=d,
                        units_sold=qty,
                        revenue=revenue,
                        order_count=max(1, qty // 2) if qty > 0 else 0,
                        avg_selling_price=price,
                        stock_at_eod=random.randint(15, 60),
                        is_demo=True,
                    )
                    db.add(agg)

        db.commit()
        print("[OK] Backfilled 90 days of daily sales aggregates across products.")

    # 5. Seed RAG Knowledge Base Documents
    # -----------------------------------------------------------------
    print("--> Seeding RAG knowledge documents & indexing chunks...")
    docs_to_seed = [
        {
            "title": "Shopera Global Procurement & Supplier Policy (SOP-01)",
            "doc_type": DocumentTypeEnum.PROCUREMENT_POLICY,
            "content": """
# SHOPERA PROCUREMENT POLICY & SUPPLIER GOVERNANCE (SOP-01)

## 1. Purpose & Scope
This Standard Operating Procedure establishes rules for vendor selection, safety stock maintenance, lead time management, and purchase order authorizations across all SHOPERA warehouse facilities.

## 2. Supplier Performance Thresholds
Vendors must maintain a minimum Reliability Score of 80% to retain primary sourcing status. The Reliability Score is derived from:
- 70% On-time delivery compliance (actual delivery date <= expected delivery date)
- 30% Lead time consistency (standard deviation of lead time < 3.0 days)

Suppliers with reliability scores below 75% are automatically demoted to secondary sourcing priority, and chronic delays trigger a vendor review notice.

## 3. Safety Stock & Reorder Trigger Formula
Safety stock is mathematically calculated using the standard service-level formula:
SS = Z * sigma * sqrt(L)
Where:
- Z = 1.65 (corresponding to a 95% service level)
- sigma = standard deviation of daily sales velocity over the past 30 days
- L = supplier lead time in days

The Reorder Point (ROP) is:
ROP = (Daily Sales Velocity * Lead Time) + Safety Stock

When current stock falls below ROP, the platform triggers an autonomous reorder recommendation in PENDING status.

## 4. Human-in-the-Loop Safeguard
Under no circumstances may the automated system issue payments or transmit binding purchase orders without explicit approval by an authorized Admin Principal.
""",
        },
        {
            "title": "Shopera Warehouse Receiving & Quality SOP (SOP-04)",
            "doc_type": DocumentTypeEnum.WAREHOUSE_SOP,
            "content": """
# SHOPERA WAREHOUSE RECEIVING & QUALITY ASSURANCE (SOP-04)

## 1. Inbound Goods Inspection
Upon arrival of a Purchase Order delivery at any regional fulfillment hub:
1. Compare shipment packing slip against the purchase order record in the Admin OS.
2. Verify item quantity and carton condition within 2 hours of receipt.
3. Record item receipt in the system by transitioning PO status from CONFIRMED to RECEIVED.
4. Marking a PO as RECEIVED automatically records an inventory transaction and recalculates the supplier's reliability score.

## 2. Defect & Shortage Protocol
- Shortages greater than 5% must be reported to the procurement department within 24 hours.
- Damaged goods must be quarantined immediately and rejected in the inventory transaction ledger under transaction type DAMAGE.
- Defect rate above 2% initiates an automated supplier quality flag.

## 3. Emergency Stockout Escalation
When a product reaches CRITICAL stockout status (days of supply <= 3 days), warehouse operations must prioritize expedited cross-docking upon shipment receipt.
""",
        },
    ]

    for d_info in docs_to_seed:
        existing_doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.title == d_info["title"]).first()
        if not existing_doc:
            doc = KnowledgeDocument(
                title=d_info["title"],
                doc_type=d_info["doc_type"],
                source="internal_sop",
                status=DocumentStatusEnum.PENDING,
                is_demo=True,
            )
            db.add(doc)
            db.flush()
            index_document(db, doc.id, d_info["content"])
    print("[OK] Knowledge base documents seeded and vector indexed.")

    # 6. Run Initial AI Diagnostics
    # -----------------------------------------------------------------
    print("--> Running customer segmentation & churn risk...")
    compute_all_segments(db)
    compute_all_risks(db)

    print("--> Running anomaly detection scan...")
    anomaly_detector.run_all_detections(db)

    print("--> Generating automated procurement recommendations...")
    generate_reorder_recommendations(db)

    db.close()
    print("================================================================")
    print("[DONE] ALL AI DEMO DATA SUCCESSFULLY SEEDED!")
    print("================================================================")


if __name__ == "__main__":
    run_seed()
