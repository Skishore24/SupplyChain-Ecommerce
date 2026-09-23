from app.core.database import Base

# ── Core ecommerce models ──────────────────────────────────────────────────
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.address import Address
from app.models.cart import Cart, CartItem
from app.models.wishlist import Wishlist, WishlistItem
from app.models.order import Order, OrderItem, Payment, Shipment, OrderStatus, PaymentStatus
from app.models.review import Review, ReviewStatus
from app.models.coupon import Coupon, CouponUsage, DiscountType

# ── Supply chain models ────────────────────────────────────────────────────
from app.models.supplier import (
    Supplier,
    SupplierProduct,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    SupplierAvailability,
)

# ── Inventory intelligence models ─────────────────────────────────────────
from app.models.inventory import (
    InventoryTransaction,
    InventoryTransactionType,
    InventorySnapshot,
    DailySalesAggregate,
)

# ── AI / ML platform models ───────────────────────────────────────────────
from app.models.ai_models import (
    # Forecasting
    DemandForecast,
    ForecastMetric,
    # Customer intelligence
    CustomerFeature,
    CustomerSegment,
    CustomerSegmentEnum,
    CustomerRisk,
    # Alerts & anomalies
    SupplyChainAlert,
    AlertTypeEnum,
    AlertStatusEnum,
    AnomalyEvent,
    # AI recommendations & audit
    AIRecommendation,
    RecommendationStatusEnum,
    AIAction,
    AIAuditLog,
    # RAG knowledge base
    KnowledgeDocument,
    KnowledgeChunk,
    DocumentStatusEnum,
    DocumentTypeEnum,
    # Agent tracking
    AgentRun,
    AgentTask,
    AgentRunStatusEnum,
    AgentTaskStatusEnum,
    # MLOps model registry
    ModelVersion,
    ModelMetric,
    ModelTypeEnum,
    # Risk levels (shared enum)
    RiskLevelEnum,
)

__all__ = [
    # Base
    "Base",

    # Core ecommerce
    "User", "UserRole",
    "Category",
    "Product", "ProductImage", "ProductVariant",
    "Address",
    "Cart", "CartItem",
    "Wishlist", "WishlistItem",
    "Order", "OrderItem", "Payment", "Shipment", "OrderStatus", "PaymentStatus",
    "Review", "ReviewStatus",
    "Coupon", "CouponUsage", "DiscountType",

    # Supply chain
    "Supplier", "SupplierProduct",
    "PurchaseOrder", "PurchaseOrderItem",
    "PurchaseOrderStatus", "SupplierAvailability",

    # Inventory
    "InventoryTransaction", "InventoryTransactionType",
    "InventorySnapshot",
    "DailySalesAggregate",

    # AI / ML
    "DemandForecast", "ForecastMetric",
    "CustomerFeature", "CustomerSegment", "CustomerSegmentEnum", "CustomerRisk",
    "SupplyChainAlert", "AlertTypeEnum", "AlertStatusEnum",
    "AnomalyEvent",
    "AIRecommendation", "RecommendationStatusEnum", "AIAction", "AIAuditLog",
    "KnowledgeDocument", "KnowledgeChunk", "DocumentStatusEnum", "DocumentTypeEnum",
    "AgentRun", "AgentTask", "AgentRunStatusEnum", "AgentTaskStatusEnum",
    "ModelVersion", "ModelMetric", "ModelTypeEnum",
    "RiskLevelEnum",
]
