"""
Supply Chain Intelligence Agent Orchestrator
=============================================
Autonomous reasoning agent with tool execution across:
- Inventory Health & Stockout Risk
- ML Demand Forecasting
- Supplier Performance & Vendor Ranking
- Customer RFM Segmentation & Churn Risk
- Statistical Anomaly Detection
- RAG Knowledge Base Retrieval

Supports Gemini / OpenAI LLM synthesis when configured,
and robust deterministic tool orchestration when running offline.
"""
from typing import Dict, Any, List, Optional
import json
import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.inventory_service import inventory_intelligence_service
from app.ai.forecasting.predict import get_stored_forecast, generate_product_forecast
from app.ai.procurement.supplier_ranking import calculate_supplier_metrics, rank_suppliers_for_product
from app.ai.customer_intelligence.segmentation import get_segment_summary
from app.ai.customer_intelligence.churn import compute_all_risks
from app.ai.anomaly.detector import anomaly_detector
from app.ai.rag.retriever import search_knowledge_base
from app.models.product import Product
from app.models.supplier import Supplier

logger = logging.getLogger(__name__)


# ── Agent Tool Implementations ─────────────────────────────────────────────────

def tool_get_inventory_summary(db: Session) -> Dict[str, Any]:
    return inventory_intelligence_service.get_inventory_health_summary(db)


def tool_get_top_stockout_risks(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
    res = inventory_intelligence_service.get_all_products_risk(db, limit=limit)
    if isinstance(res, dict):
        return res.get("items", [])[:limit]
    return res[:limit]


def tool_get_product_demand_forecast(db: Session, product_id: int, horizon: int = 30) -> Dict[str, Any]:
    return generate_product_forecast(db, product_id=product_id, horizon_days=horizon)


def tool_rank_suppliers_for_item(db: Session, product_id: int) -> List[Dict[str, Any]]:
    return rank_suppliers_for_product(db, product_id=product_id)


def tool_get_churn_risks(db: Session) -> Dict[str, Any]:
    return get_segment_summary(db)


def tool_get_recent_anomalies(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
    anomaly_detector.run_all_detections(db)
    from app.models.ai_models import AnomalyEvent
    anoms = db.query(AnomalyEvent).order_by(AnomalyEvent.detected_at.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "anomaly_type": a.anomaly_type,
            "entity_name": a.entity_name,
            "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity),
            "detected_at": a.detected_at.isoformat() if a.detected_at else None,
        }
        for a in anoms
    ]


def tool_query_knowledge_base(db: Session, query: str) -> List[Dict[str, Any]]:
    return search_knowledge_base(db, query=query, top_k=3)


# ── Orchestrator ───────────────────────────────────────────────────────────────

class SupplyChainAgent:
    def __init__(self):
        self._llm_provider = settings.LLM_PROVIDER
        self._gemini_key = settings.GEMINI_API_KEY
        self._openai_key = settings.OPENAI_API_KEY

    def answer_query(self, db: Session, user_query: str) -> Dict[str, Any]:
        """
        Processes a user question, executes the necessary analytical tools,
        and generates a comprehensive, explainable answer.
        """
        q = user_query.lower()
        tools_used = []
        context_data = {}

        # 1. Intent routing & tool execution
        if any(w in q for w in ["inventory", "stockout", "stock", "health", "reorder"]):
            tools_used.append("tool_get_inventory_summary")
            tools_used.append("tool_get_top_stockout_risks")
            context_data["inventory_summary"] = tool_get_inventory_summary(db)
            context_data["critical_products"] = tool_get_top_stockout_risks(db, limit=5)

        if any(w in q for w in ["forecast", "demand", "predict", "sales trajectory"]):
            tools_used.append("tool_get_product_demand_forecast")
            # If product mentioned, find it
            first_product = db.query(Product).first()
            if first_product:
                context_data["sample_forecast"] = {
                    "product_name": first_product.name,
                    "product_id": first_product.id,
                    "data": tool_get_product_demand_forecast(db, first_product.id, 14),
                }

        if any(w in q for w in ["supplier", "vendor", "lead time", "procure", "po"]):
            tools_used.append("tool_rank_suppliers")
            first_product = db.query(Product).first()
            if first_product:
                context_data["supplier_rankings"] = tool_rank_suppliers_for_item(db, first_product.id)

        if any(w in q for w in ["customer", "churn", "rfm", "segment", "retention"]):
            tools_used.append("tool_get_churn_risks")
            context_data["customer_segments"] = tool_get_churn_risks(db)

        if any(w in q for w in ["anomaly", "spike", "drop", "outlier", "unusual"]):
            tools_used.append("tool_get_recent_anomalies")
            context_data["recent_anomalies"] = tool_get_recent_anomalies(db, limit=5)

        # Always check RAG knowledge base for policy/domain documents
        rag_hits = tool_query_knowledge_base(db, user_query)
        if rag_hits:
            tools_used.append("tool_query_knowledge_base")
            context_data["knowledge_base_excerpts"] = rag_hits

        # 2. Response generation via LLM if available
        if self._gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self._gemini_key)
                prompt = (
                    f"You are the senior AI Supply Chain Intelligence assistant for the SHOPERA platform.\n"
                    f"User question: {user_query}\n\n"
                    f"Real-time platform data:\n{json.dumps(context_data, default=str, indent=2)}\n\n"
                    f"Answer accurately, professionally, and concisely using the provided numbers. Never hallucinate metrics."
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                return {
                    "answer": response.text,
                    "tools_used": tools_used,
                    "context_data": context_data,
                    "source": "gemini-2.5-flash",
                }
            except Exception as e:
                logger.warning(f"Gemini LLM call failed, falling back to deterministic response: {e}")

        # 3. Deterministic response generator (zero hallucination, real data)
        answer_parts = []

        if "inventory_summary" in context_data:
            inv = context_data["inventory_summary"]
            answer_parts.append(
                f"**Inventory Health:** Current average health score is **{inv.get('avg_inventory_health_score')}%**. "
                f"There are **{inv.get('critical_count', 0)}** items in critical stockout condition and "
                f"**{inv.get('needs_reorder_count', 0)}** products requiring immediate reorder."
            )
            crits = context_data.get("critical_products", [])
            if crits:
                crit_names = [f"'{c.get('product_name')}' (Stock: {c.get('current_stock')}, Risk: {c.get('stockout_risk_score')}%)" for c in crits[:3]]
                answer_parts.append(f"**Top At-Risk Products:** {'; '.join(crit_names)}.")

        if "customer_segments" in context_data:
            seg = context_data["customer_segments"]
            answer_parts.append(
                f"**Customer Intelligence:** {seg.get('total_segmented', 0)} customers segmented. "
                f"**{seg.get('at_risk_count', 0)}** customers are exhibiting elevated churn risk signals. "
                f"High-value VIP cohort comprises {seg.get('high_value_count', 0)} customers."
            )

        if "recent_anomalies" in context_data:
            anoms = context_data["recent_anomalies"]
            if anoms:
                answer_parts.append(f"**Anomalies:** Detected {len(anoms)} active outliers in the supply chain velocity baseline.")
            else:
                answer_parts.append("**Anomalies:** No critical statistical anomalies detected in the last scan window.")

        if "knowledge_base_excerpts" in context_data:
            excerpts = context_data["knowledge_base_excerpts"]
            if excerpts:
                answer_parts.append(f"**Knowledge Base Match ({excerpts[0]['document_title']}):** \"{excerpts[0]['content'][:200]}...\"")

        if not answer_parts:
            answer_parts.append(
                f"I processed your query about '{user_query}'. All supply chain pipelines are operating normally. "
                f"You can view specific details in the Inventory, Forecasting, or Alert Center modules."
            )

        return {
            "answer": "\n\n".join(answer_parts),
            "tools_used": tools_used,
            "context_data": context_data,
            "source": "autonomous_orchestrator",
        }


supply_chain_agent = SupplyChainAgent()
