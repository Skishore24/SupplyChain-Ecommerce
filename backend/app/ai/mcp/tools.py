"""
Model Context Protocol (MCP) Tool Definitions
=============================================
Exposes supply chain intelligence capabilities as structured MCP tools
compatible with Claude, Gemini, and other MCP-enabled AI agents.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.inventory_service import inventory_intelligence_service
from app.ai.forecasting.predict import generate_product_forecast
from app.ai.procurement.supplier_ranking import rank_suppliers_for_product, calculate_supplier_metrics
from app.ai.customer_intelligence.segmentation import get_segment_summary
from app.ai.anomaly.detector import anomaly_detector
from app.ai.rag.retriever import search_knowledge_base


MCP_TOOLS_MANIFEST = [
    {
        "name": "get_inventory_health",
        "description": "Returns overall inventory health score, critical risk counts, and reorder alerts.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_stockout_risks",
        "description": "Lists inventory products ranked by stockout probability with days of supply and safety stock.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max products to return (default 10)", "default": 10},
            },
        },
    },
    {
        "name": "predict_demand",
        "description": "Generates multi-horizon ML demand forecast for a product with confidence bounds and error metrics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer", "description": "Target product ID"},
                "horizon_days": {"type": "integer", "description": "Forecast horizon (7, 14, 30, 60, 90 days)", "default": 30},
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "rank_suppliers",
        "description": "Ranks eligible suppliers for a product using multi-criteria optimization (reliability, lead time, price).",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer", "description": "Target product ID"},
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "get_customer_churn_risks",
        "description": "Retrieves RFM customer segmentation summary and identified churn risk counts.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "detect_supply_chain_anomalies",
        "description": "Executes real-time statistical anomaly detection across sales velocity and inventory levels.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "query_supply_chain_rag",
        "description": "Searches internal warehouse SOPs, procurement policies, and vendor agreements.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Semantic search query"},
                "top_k": {"type": "integer", "description": "Number of relevant chunks to retrieve", "default": 3},
            },
            "required": ["query"],
        },
    },
]


def execute_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Dispatches and executes an MCP tool call against the active database."""
    db: Session = SessionLocal()
    try:
        if tool_name == "get_inventory_health":
            return inventory_intelligence_service.get_inventory_health_summary(db)

        elif tool_name == "get_stockout_risks":
            limit = arguments.get("limit", 10)
            return inventory_intelligence_service.get_all_products_risk(db, limit=limit)

        elif tool_name == "predict_demand":
            product_id = arguments["product_id"]
            horizon = arguments.get("horizon_days", 30)
            return generate_product_forecast(db, product_id=product_id, horizon_days=horizon)

        elif tool_name == "rank_suppliers":
            product_id = arguments["product_id"]
            return {"suppliers": rank_suppliers_for_product(db, product_id=product_id)}

        elif tool_name == "get_customer_churn_risks":
            return get_segment_summary(db)

        elif tool_name == "detect_supply_chain_anomalies":
            counts = anomaly_detector.run_all_detections(db)
            return {"status": "complete", "anomalies_detected": counts}

        elif tool_name == "query_supply_chain_rag":
            q = arguments["query"]
            top_k = arguments.get("top_k", 3)
            return {"results": search_knowledge_base(db, query=q, top_k=top_k)}

        else:
            return {"error": f"Unknown tool: {tool_name}"}
    finally:
        db.close()
