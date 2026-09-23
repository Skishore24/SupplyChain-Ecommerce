"""
AI & ML Platform Models
========================
Database models for the entire AI/ML layer:
- Demand forecasting results and metrics
- Customer intelligence (features, segments, risk)
- Supply chain alerts and anomaly events
- AI recommendations and actions with approval workflow
- Audit logging for all AI actions
- RAG knowledge base documents and chunks
- Agent run tracking and task logs
- Model version registry and metrics

IMPORTANT: No fake/random values are stored in these tables.
Every value comes from real computation — SQL, ML, or rules.
"""
from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean,
    DateTime, Date, ForeignKey, Enum, Float, JSON, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# ─────────────────────────────────────────────────────────
# Demand Forecasting
# ─────────────────────────────────────────────────────────

class DemandForecast(Base):
    """
    Stores ML-generated demand forecasts per product per date.
    model_source identifies whether this came from ML, DL, or a fallback rule.
    """
    __tablename__ = "demand_forecasts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)     # the date being forecast
    horizon_days = Column(Integer, nullable=False)               # how many days ahead
    predicted_quantity = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)                   # confidence interval lower
    upper_bound = Column(Float, nullable=True)                   # confidence interval upper
    model_version = Column(String(100), nullable=True)           # model registry ID
    model_source = Column(String(50), nullable=False, default="ML")  # ML, DL, RULE, MOVING_AVG
    confidence = Column(Float, nullable=True)                    # 0-1 confidence level
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product")


class ForecastMetric(Base):
    """
    Evaluation metrics for a trained model version.
    Stored after time-aware walk-forward cross-validation.
    """
    __tablename__ = "forecast_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version = Column(String(100), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    mape = Column(Float, nullable=True)
    wape = Column(Float, nullable=True)
    bias = Column(Float, nullable=True)
    eval_date = Column(Date, nullable=True)
    dataset_size = Column(Integer, nullable=True)         # number of training samples
    horizon_days = Column(Integer, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product")


# ─────────────────────────────────────────────────────────
# Customer Intelligence
# ─────────────────────────────────────────────────────────

class CustomerFeature(Base):
    """
    Computed RFM and behavioral features per customer.
    Refreshed daily by background job from order history.
    """
    __tablename__ = "customer_features"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    recency_days = Column(Integer, nullable=True)          # days since last purchase
    frequency = Column(Integer, nullable=True)             # total number of orders
    monetary_value = Column(Numeric(12, 2), nullable=True) # total lifetime spend
    avg_order_value = Column(Numeric(10, 2), nullable=True)
    return_rate = Column(Float, nullable=True)             # fraction of orders returned
    discount_usage_rate = Column(Float, nullable=True)     # fraction of orders using coupon
    days_since_last_purchase = Column(Integer, nullable=True)
    avg_days_between_orders = Column(Float, nullable=True)
    preferred_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    computed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    preferred_category = relationship("Category")


class CustomerSegmentEnum(str, enum.Enum):
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    REPEAT = "REPEAT"
    HIGH_VALUE = "HIGH_VALUE"
    INACTIVE = "INACTIVE"
    AT_RISK = "AT_RISK"


class CustomerSegment(Base):
    """
    RFM segment classification per customer.
    Segments are computed from CustomerFeature — not manually assigned.
    """
    __tablename__ = "customer_segments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    segment = Column(Enum(CustomerSegmentEnum), nullable=False, index=True)
    rfm_recency_score = Column(Integer, nullable=True)    # 1-5
    rfm_frequency_score = Column(Integer, nullable=True)  # 1-5
    rfm_monetary_score = Column(Integer, nullable=True)   # 1-5
    rfm_total_score = Column(Integer, nullable=True)      # sum of above
    segment_method = Column(String(50), default="RFM_RULES", nullable=False)  # RFM_RULES, KMEANS
    is_demo = Column(Boolean, default=False, nullable=False)
    computed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")


class RiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CustomerRisk(Base):
    """
    Churn/inactivity risk score per customer.
    reason_codes is a JSON list of human-readable explanations.
    Never display a score without reason codes.
    """
    __tablename__ = "customer_risks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    risk_score = Column(Float, nullable=False)            # 0-100
    risk_level = Column(Enum(RiskLevelEnum), nullable=False, index=True)
    reason_codes = Column(JSON, nullable=True)            # list of {"code": str, "description": str}
    model_version = Column(String(100), nullable=True)
    model_source = Column(String(50), default="LOGISTIC_REGRESSION", nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    computed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")


# ─────────────────────────────────────────────────────────
# Alerts & Anomalies
# ─────────────────────────────────────────────────────────

class AlertTypeEnum(str, enum.Enum):
    STOCKOUT_RISK = "STOCKOUT_RISK"
    OVERSTOCK = "OVERSTOCK"
    DEMAND_SPIKE = "DEMAND_SPIKE"
    DEMAND_DROP = "DEMAND_DROP"
    SUPPLIER_DELAY = "SUPPLIER_DELAY"
    SUPPLIER_RISK = "SUPPLIER_RISK"
    CUSTOMER_RISK = "CUSTOMER_RISK"
    ANOMALY = "ANOMALY"
    FORECAST_FAILURE = "FORECAST_FAILURE"
    DATA_QUALITY = "DATA_QUALITY"
    LOW_STOCK = "LOW_STOCK"


class AlertStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class SupplyChainAlert(Base):
    """
    Supply chain alert events. Every alert must have:
    - Clear type and severity
    - Human-readable description
    - Evidence (JSON) with the data that triggered it
    - Entity reference (product, supplier, customer)
    """
    __tablename__ = "supply_chain_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_type = Column(Enum(AlertTypeEnum), nullable=False, index=True)
    severity = Column(Enum(RiskLevelEnum), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)               # structured data that triggered alert
    entity_type = Column(String(50), nullable=True)      # "product", "supplier", "customer"
    entity_id = Column(Integer, nullable=True, index=True)
    entity_name = Column(String(255), nullable=True)
    status = Column(Enum(AlertStatusEnum), default=AlertStatusEnum.OPEN, nullable=False, index=True)
    acknowledged_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])


class AnomalyEvent(Base):
    """
    Detected anomaly event with full evidence chain.
    model_used identifies whether detection was: Z_SCORE, IQR, RULE, ISOLATION_FOREST.
    """
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False, index=True)  # product, supplier, customer
    entity_id = Column(Integer, nullable=False, index=True)
    entity_name = Column(String(255), nullable=True)
    anomaly_type = Column(String(100), nullable=False)   # e.g. "demand_spike", "inventory_drop"
    severity = Column(Enum(RiskLevelEnum), nullable=False)
    detected_at = Column(DateTime, nullable=False, index=True)
    evidence = Column(JSON, nullable=True)               # {"value": x, "expected": y, "z_score": z, ...}
    model_used = Column(String(100), nullable=True)
    recommendation = Column(Text, nullable=True)
    alert_id = Column(Integer, ForeignKey("supply_chain_alerts.id", ondelete="SET NULL"), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    alert = relationship("SupplyChainAlert")


# ─────────────────────────────────────────────────────────
# AI Recommendations & Actions
# ─────────────────────────────────────────────────────────

class RecommendationStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    EXPIRED = "EXPIRED"


class AIRecommendation(Base):
    """
    AI-generated business recommendation requiring admin review.
    No financial or operational action is taken until admin approves.
    calculations JSON must explain HOW the recommendation was derived.
    """
    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rec_type = Column(String(100), nullable=False, index=True)  # "reorder", "supplier_change", etc.
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True, index=True)
    entity_name = Column(String(255), nullable=True)
    title = Column(String(500), nullable=False)
    reason = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)               # raw data used
    calculations = Column(JSON, nullable=True)           # step-by-step calculation shown to admin
    recommended_action = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)            # 0-1 (only if ML-derived, otherwise null)
    model_version = Column(String(100), nullable=True)
    model_source = Column(String(50), nullable=True)     # ML, RULE, AGENT, etc.
    urgency = Column(Enum(RiskLevelEnum), default=RiskLevelEnum.MEDIUM, nullable=False)
    status = Column(
        Enum(RecommendationStatusEnum),
        default=RecommendationStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class AIAction(Base):
    """
    Records of actions taken (or attempted) after recommendation approval.
    This provides a complete execution audit trail.
    """
    __tablename__ = "ai_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recommendation_id = Column(
        Integer, ForeignKey("ai_recommendations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, SUCCESS, FAILED
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    executed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    recommendation = relationship("AIRecommendation")
    executed_by = relationship("User", foreign_keys=[executed_by_id])


class AIAuditLog(Base):
    """
    Comprehensive audit log for all AI actions and agent activities.
    Immutable — records are never updated, only inserted.
    """
    __tablename__ = "ai_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(200), nullable=False, index=True)
    agent = Column(String(100), nullable=True)
    tool = Column(String(100), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="SUCCESS")
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User")


# ─────────────────────────────────────────────────────────
# RAG Knowledge Base
# ─────────────────────────────────────────────────────────

class DocumentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    INDEXING = "INDEXING"
    INDEXED = "INDEXED"
    FAILED = "FAILED"


class DocumentTypeEnum(str, enum.Enum):
    SUPPLIER_DOCUMENT = "SUPPLIER_DOCUMENT"
    PROCUREMENT_POLICY = "PROCUREMENT_POLICY"
    INVENTORY_POLICY = "INVENTORY_POLICY"
    WAREHOUSE_SOP = "WAREHOUSE_SOP"
    SHIPPING_POLICY = "SHIPPING_POLICY"
    PRODUCT_MANUAL = "PRODUCT_MANUAL"
    INTERNAL_DOCUMENTATION = "INTERNAL_DOCUMENTATION"
    INCIDENT_REPORT = "INCIDENT_REPORT"
    OTHER = "OTHER"


class KnowledgeDocument(Base):
    """
    Uploaded business documents for the RAG knowledge base.
    Files are stored on disk; metadata and indexing status tracked here.
    """
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    source = Column(String(500), nullable=True)              # original filename or URL
    doc_type = Column(Enum(DocumentTypeEnum), nullable=False, index=True)
    file_path = Column(String(1000), nullable=True)          # server-side storage path
    content_hash = Column(String(64), nullable=True, index=True)  # SHA-256 for dedup
    file_size_bytes = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)
    chunk_count = Column(Integer, nullable=True)
    status = Column(Enum(DocumentStatusEnum), default=DocumentStatusEnum.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    indexed_at = Column(DateTime, nullable=True)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")
    supplier = relationship("Supplier")
    product = relationship("Product")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class KnowledgeChunk(Base):
    """
    Text chunks extracted from KnowledgeDocument for vector storage.
    embedding_vector_id is the ID in the ChromaDB collection.
    """
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(
        Integer,
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    char_count = Column(Integer, nullable=True)
    embedding_vector_id = Column(String(255), nullable=True, index=True)  # ChromaDB doc ID
    chunk_metadata = Column(JSON, nullable=True)        # {"page": n, "section": str, ...}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("KnowledgeDocument", back_populates="chunks")


# ─────────────────────────────────────────────────────────
# Agent Run Tracking
# ─────────────────────────────────────────────────────────

class AgentRunStatusEnum(str, enum.Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AgentRun(Base):
    """
    Records each multi-agent orchestration run.
    Provides the execution trace visible in the admin UI.
    """
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(100), unique=True, index=True, nullable=False)  # UUID
    trigger_type = Column(String(50), nullable=False)    # "user_chat", "scheduled", "api"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    query = Column(Text, nullable=True)
    agents_used = Column(JSON, nullable=True)            # list of agent names invoked
    final_answer = Column(Text, nullable=True)
    status = Column(Enum(AgentRunStatusEnum), default=AgentRunStatusEnum.RUNNING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)

    user = relationship("User")
    tasks = relationship("AgentTask", back_populates="agent_run", cascade="all, delete-orphan")


class AgentTaskStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class AgentTask(Base):
    """
    Individual tool call or sub-task within an AgentRun.
    Provides granular execution trace for the admin UI.
    """
    __tablename__ = "agent_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(100), ForeignKey("agent_runs.run_id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String(100), nullable=False)
    tool_name = Column(String(100), nullable=True)
    task_description = Column(Text, nullable=True)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)              # concise reasoning (not raw chain-of-thought)
    status = Column(Enum(AgentTaskStatusEnum), default=AgentTaskStatusEnum.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    task_order = Column(Integer, nullable=False, default=0)

    agent_run = relationship("AgentRun", back_populates="tasks")


# ─────────────────────────────────────────────────────────
# MLOps — Model Registry & Metrics
# ─────────────────────────────────────────────────────────

class ModelTypeEnum(str, enum.Enum):
    FORECASTING = "FORECASTING"
    CLASSIFICATION = "CLASSIFICATION"
    CLUSTERING = "CLUSTERING"
    ANOMALY_DETECTION = "ANOMALY_DETECTION"
    EMBEDDING = "EMBEDDING"
    RERANKER = "RERANKER"
    LLM = "LLM"


class ModelVersion(Base):
    """
    Model registry entry. Supports multiple versions per model name.
    Only one version per model_name should have is_active=True.
    """
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(200), nullable=False, index=True)
    model_type = Column(Enum(ModelTypeEnum), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    algorithm = Column(String(100), nullable=True)       # e.g. "GradientBoostingRegressor"
    file_path = Column(String(1000), nullable=True)      # serialized model path
    provider = Column(String(100), nullable=True)        # "local", "gemini", "openai"
    hyperparameters = Column(JSON, nullable=True)
    training_dataset_version = Column(String(100), nullable=True)
    training_samples = Column(Integer, nullable=True)
    feature_names = Column(JSON, nullable=True)          # list of feature column names
    target_variable = Column(String(100), nullable=True)
    metrics = Column(JSON, nullable=True)                # summary metrics dict
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    trained_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    metric_records = relationship("ModelMetric", back_populates="model_version_rel", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_model_versions_name_active", "model_name", "is_active"),
    )


class ModelMetric(Base):
    """
    Detailed metric records for a ModelVersion.
    Allows tracking metric history across evaluations.
    """
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version_id = Column(
        Integer,
        ForeignKey("model_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    split = Column(String(50), nullable=True)            # "train", "val", "test"
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    model_version_rel = relationship("ModelVersion", back_populates="metric_records")
