import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Zap, Shield, X } from "lucide-react";
import aiApi from "../../../services/aiApi";

const priorityColors = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#d97706",
  LOW: "#16a34a",
};

const priorityBg = {
  CRITICAL: "#fef2f2",
  HIGH: "#fff7ed",
  MEDIUM: "#fffbeb",
  LOW: "#f0fdf4",
};

const priorityBorder = {
  CRITICAL: "#fecaca",
  HIGH: "#fed7aa",
  MEDIUM: "#fde68a",
  LOW: "#bbf7d0",
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState(null);

  const fetchRecs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiApi.getRecommendations(
        statusFilter === "ALL" ? undefined : statusFilter,
        50
      );
      setRecommendations(res.data?.recommendations || []);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setError("Failed to fetch recommendations from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecs(); }, [statusFilter]);

  const handleApprove = async (recId) => {
    try {
      setActionLoadingId(recId);
      await aiApi.reviewRecommendation(recId, "approve");
      fetchRecs();
    } catch (err) {
      console.error("Failed to approve recommendation:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalId) return;
    try {
      setActionLoadingId(rejectModalId);
      await aiApi.reviewRecommendation(rejectModalId, "reject", rejectReason);
      setRejectModalId(null);
      setRejectReason("");
      fetchRecs();
    } catch (err) {
      console.error("Failed to reject recommendation:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#111827" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              to="/admin/ai"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                color: "#374151",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "11px",
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                }}
              >
                <Lightbulb size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                  Autonomous AI Recommendations
                </h1>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Machine-generated supply chain interventions requiring explicit human-in-the-loop sign-off
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchRecs}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Governance Notice */}
        <div
          style={{
            marginTop: "18px",
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: "12px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "#374151",
          }}
        >
          <Shield size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
          <span>
            <strong style={{ color: "#4338ca" }}>Human-in-the-Loop Governance:</strong> AI proposals are strictly gated. Financial commitments or purchase order creation only proceed after explicit admin confirmation.
          </span>
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: "flex",
            background: "#f9fafb",
            padding: "3px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            marginTop: "16px",
            width: "fit-content",
            gap: "2px",
          }}
        >
          {["PENDING", "APPROVED", "REJECTED", "EXECUTED", "ALL"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "5px 13px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: statusFilter === s ? "#fff" : "transparent",
                color: statusFilter === s ? "#2563eb" : "#64748b",
                boxShadow: statusFilter === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "14px 18px",
            color: "#dc2626",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>
          Loading AI recommendations...
        </div>
      ) : recommendations.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
          }}
        >
          <Lightbulb size={36} style={{ color: "#bbf7d0", marginBottom: "12px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
            No {statusFilter.toLowerCase()} recommendations
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            All actions have been addressed or no interventions are needed.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {recommendations.map((rec) => {
            const pColor = priorityColors[rec.priority] || "#6b7280";
            const isLoadingItem = actionLoadingId === rec.id;

            return (
              <div
                key={rec.id}
                style={{
                  background: "#fff",
                  border: `1px solid ${priorityBorder[rec.priority] || "#e5e7eb"}`,
                  borderLeft: `4px solid ${pColor}`,
                  borderRadius: "16px",
                  padding: "22px",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                  <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: pColor,
                          background: priorityBg[rec.priority] || "#f9fafb",
                          border: `1px solid ${priorityBorder[rec.priority] || "#e5e7eb"}`,
                          padding: "2px 7px",
                          borderRadius: "6px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {rec.priority}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#6366f1",
                          background: "#eef2ff",
                          border: "1px solid #c7d2fe",
                          padding: "2px 7px",
                          borderRadius: "6px",
                        }}
                      >
                        {rec.recommendation_type || rec.type}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Created: {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 7px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                      {rec.title}
                    </h3>

                    <p style={{ margin: "0 0 11px", fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                      {rec.description}
                    </p>

                    {/* Impact metrics */}
                    {rec.impact_estimate && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "16px",
                          padding: "7px 13px",
                          background: "#f9fafb",
                          border: "1px solid #f1f5f9",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      >
                        {rec.impact_estimate.cost_savings && (
                          <div>
                            <span style={{ color: "#64748b" }}>Est. Savings: </span>
                            <span style={{ color: "#16a34a", fontWeight: 700 }}>${rec.impact_estimate.cost_savings}</span>
                          </div>
                        )}
                        {rec.impact_estimate.stockout_risk_reduction && (
                          <div>
                            <span style={{ color: "#64748b" }}>Risk Reduction: </span>
                            <span style={{ color: "#2563eb", fontWeight: 700 }}>-{rec.impact_estimate.stockout_risk_reduction}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {rec.status === "PENDING" && (
                      <>
                        <button
                          disabled={isLoadingItem}
                          onClick={() => handleApprove(rec.id)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: "9px",
                            background: "#16a34a",
                            border: "none",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          disabled={isLoadingItem}
                          onClick={() => { setRejectModalId(rec.id); setRejectReason(""); }}
                          style={{
                            padding: "7px 13px",
                            borderRadius: "9px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#dc2626",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <X size={13} />
                          Reject
                        </button>
                      </>
                    )}

                    {rec.status === "APPROVED" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#16a34a", fontSize: "13px", fontWeight: 700 }}>
                        <CheckCircle size={14} />
                        Approved
                      </div>
                    )}

                    {rec.status === "REJECTED" && (
                      <div style={{ color: "#dc2626", fontSize: "13px" }}>
                        Rejected {rec.rejection_reason && `("${rec.rejection_reason}")`}
                      </div>
                    )}

                    {rec.status === "EXECUTED" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#6366f1", fontSize: "13px", fontWeight: 600 }}>
                        <Zap size={14} />
                        Executed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "26px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 40px -8px rgba(15,23,42,0.16)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              Reject Recommendation
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
              Provide a rationale for the audit trail. This will be stored for future model calibration.
            </p>
            <textarea
              placeholder="e.g., Supplier pricing renegotiation in progress..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px",
                color: "#111827",
                fontSize: "13px",
                minHeight: "80px",
                marginBottom: "18px",
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setRejectModalId(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#dc2626",
                  border: "none",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
