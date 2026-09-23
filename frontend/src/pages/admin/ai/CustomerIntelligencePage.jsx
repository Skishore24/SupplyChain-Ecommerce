import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowLeft, Zap, AlertTriangle, Search, Lightbulb } from "lucide-react";
import aiApi from "../../../services/aiApi";

const segmentColors = {
  HIGH_VALUE: "#6366f1",
  ACTIVE: "#16a34a",
  REPEAT: "#2563eb",
  NEW: "#8b5cf6",
  AT_RISK: "#ea580c",
  INACTIVE: "#dc2626",
};

const segmentBg = {
  HIGH_VALUE: "#eef2ff",
  ACTIVE: "#f0fdf4",
  REPEAT: "#eff6ff",
  NEW: "#f5f3ff",
  AT_RISK: "#fff7ed",
  INACTIVE: "#fef2f2",
};

export default function CustomerIntelligencePage() {
  const [summary, setSummary] = useState(null);
  const [atRiskList, setAtRiskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [custLoading, setCustLoading] = useState(false);
  const [custDetail, setCustDetail] = useState(null);
  const [inspectUserId, setInspectUserId] = useState("");
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, riskRes] = await Promise.allSettled([
        aiApi.getSegmentSummary(),
        aiApi.getAtRiskCustomers(50),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (riskRes.status === "fulfilled") setAtRiskList(riskRes.value.data.customers || []);
    } catch (err) {
      console.error("Failed to load customer intelligence:", err);
      setError("Failed to fetch customer intelligence data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      const res = await aiApi.updateCustomerIntelligence();
      setUpdateMsg(res.data?.message || "Customer intelligence update initiated.");
      setTimeout(() => { setUpdateMsg(null); fetchData(); }, 3000);
    } catch (err) {
      setUpdateMsg("Failed to start customer update job.");
    } finally {
      setUpdating(false);
    }
  };

  const inspectCustomer = async (userId) => {
    if (!userId) return;
    try {
      setCustLoading(true);
      const res = await aiApi.getCustomerIntelligence(userId);
      setCustDetail(res.data);
    } catch (err) {
      console.error("Failed to inspect customer:", err);
    } finally {
      setCustLoading(false);
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
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(217,119,6,0.25)",
                }}
              >
                <Users size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                  Customer Intelligence & Churn Risk
                </h1>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                  RFM segmentation, predictive lifetime value, and early-warning churn signals
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {updateMsg && (
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>{updateMsg}</span>
            )}
            <button
              onClick={handleUpdate}
              disabled={updating}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid #ddd6fe",
                background: "#ede9fe",
                color: "#7c3aed",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Zap size={13} />
              {updating ? "Recalculating..." : "Refresh All Segments"}
            </button>
          </div>
        </div>

        {/* Segment Summary Cards */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            {Object.entries(summary.segments || {}).map(([seg, count]) => {
              const color = segmentColors[seg] || "#6b7280";
              const total = summary.total_segmented || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div
                  key={seg}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderTop: `3px solid ${color}`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    {seg.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color, marginTop: "4px" }}>{count}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{pct}% of base</div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px" }}>
        {/* At-Risk Customers Table */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={16} style={{ color: "#dc2626" }} />
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                High Churn Risk Cohort
              </h2>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Showing top {atRiskList.length} by churn score
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
              Computing RFM percentiles and churn probability vectors...
            </div>
          ) : atRiskList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                color: "#94a3b8",
              }}
            >
              No customers currently identified as high churn risk.
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#64748b" }}>
                      <th style={{ padding: "12px 18px", fontWeight: 700, fontSize: "12px" }}>Customer</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "12px" }}>Segment</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "12px" }}>Churn Risk</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "12px" }}>Last Active</th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "12px" }}>Signals</th>
                      <th style={{ padding: "12px 18px", textAlign: "right", fontWeight: 700, fontSize: "12px" }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskList.map((cust) => {
                      const score = cust.churn_risk_score ?? 0;
                      const scoreColor = score > 75 ? "#dc2626" : score > 50 ? "#ea580c" : "#d97706";
                      return (
                        <tr
                          key={cust.user_id}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 18px" }}>
                            <div style={{ fontWeight: 600, color: "#111827" }}>
                              {cust.name || cust.email || `User #${cust.user_id}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {cust.email || `ID: ${cust.user_id}`}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: segmentColors[cust.segment] || "#6b7280",
                                background: segmentBg[cust.segment] || "#f9fafb",
                                padding: "2px 7px",
                                borderRadius: "6px",
                              }}
                            >
                              {cust.segment}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "50px", height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ width: `${score}%`, height: "100%", background: scoreColor }} />
                              </div>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: scoreColor }}>{score}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b" }}>
                            {cust.recency_days !== null ? `${cust.recency_days}d ago` : "N/A"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {(cust.risk_reasons || []).slice(0, 2).map((r) => (
                                <span
                                  key={r}
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "12px 18px", textAlign: "right" }}>
                            <button
                              onClick={() => inspectCustomer(cust.user_id)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                border: "1px solid #ddd6fe",
                                background: "#ede9fe",
                                color: "#7c3aed",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              View RFM →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Customer RFM Inspector Panel */}
        <div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "22px",
              position: "sticky",
              top: "24px",
              boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Search size={15} style={{ color: "#6366f1" }} />
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                Customer RFM Inspector
              </h3>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              <input
                type="text"
                placeholder="Enter User ID..."
                value={inspectUserId}
                onChange={(e) => setInspectUserId(e.target.value)}
                style={{
                  flex: 1,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#111827",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                onClick={() => inspectCustomer(inspectUserId)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "#ede9fe",
                  border: "1px solid #ddd6fe",
                  color: "#7c3aed",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Lookup
              </button>
            </div>

            {custLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                Retrieving RFM feature vector...
              </div>
            ) : custDetail ? (
              <div>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "14px", marginBottom: "14px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                    {custDetail.name || `Customer #${custDetail.user_id}`}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{custDetail.email}</div>
                  <div style={{ marginTop: "8px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        color: segmentColors[custDetail.segment] || "#6b7280",
                        background: segmentBg[custDetail.segment] || "#f9fafb",
                      }}
                    >
                      {custDetail.segment}
                    </span>
                  </div>
                </div>

                {/* RFM Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  {[
                    { label: "Recency", value: `${custDetail.features?.recency_days ?? "—"}d` },
                    { label: "Frequency", value: `${custDetail.features?.total_orders ?? "—"} orders` },
                    { label: "Total Spend", value: `$${custDetail.features?.total_spend?.toFixed(2) ?? "0.00"}`, color: "#16a34a" },
                    { label: "Avg Order Value", value: `$${custDetail.features?.avg_order_value?.toFixed(2) ?? "0.00"}` },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#f9fafb", border: "1px solid #f1f5f9", padding: "12px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "2px", color: color || "#111827" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Churn Risk */}
                {custDetail.churn_risk && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626" }}>Churn Risk Score</span>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "#dc2626" }}>
                        {custDetail.churn_risk.risk_score}%
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#374151" }}>
                      {custDetail.churn_risk.reasons?.join(" · ") || "No specific warning flags."}
                    </div>
                  </div>
                )}

                {/* Retention Strategy */}
                <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <Lightbulb size={13} style={{ color: "#6366f1" }} />
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#4338ca" }}>Recommended Retention Strategy</div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.4 }}>
                    {custDetail.segment === "HIGH_VALUE"
                      ? "Personal VIP outreach + exclusive early access discount."
                      : custDetail.segment === "AT_RISK"
                      ? "Automated re-engagement email with 15% personalized coupon."
                      : "Maintain automated lifecycle follow-up."}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#94a3b8", fontSize: "13px" }}>
                Select a customer from the table or enter a user ID above to inspect full RFM intelligence.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
