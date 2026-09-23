import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import aiApi from "../../../services/aiApi";

const severityColors = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#d97706",
  LOW: "#16a34a",
};

const severityBg = {
  CRITICAL: "#fef2f2",
  HIGH: "#fff7ed",
  MEDIUM: "#fffbeb",
  LOW: "#f0fdf4",
};

const severityBorder = {
  CRITICAL: "#fecaca",
  HIGH: "#fed7aa",
  MEDIUM: "#fde68a",
  LOW: "#bbf7d0",
};

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        limit: 100,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        severity: severityFilter === "ALL" ? undefined : severityFilter,
      };
      const res = await aiApi.getAlerts(params);
      setAlerts(res.data?.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
      setError("Failed to fetch alerts. Backend may be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAction = async (alertId, action) => {
    try {
      setActionLoadingId(alertId);
      await aiApi.updateAlert(alertId, action);
      fetchAlerts();
    } catch (err) {
      console.error(`Failed to ${action} alert:`, err);
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
              title="Back to Command Center"
            >
              <ArrowLeft size={16} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "11px",
                  background: "linear-gradient(135deg, #ea580c, #f97316)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(234,88,12,0.25)",
                }}
              >
                <Bell size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                  Supply Chain Alert Center
                </h1>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Autonomous monitoring: Stockout risks, demand spikes, supplier delays, and anomalies
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
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

        {/* Filter Strip */}
        <div style={{ display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" }}>
          {/* Status Tabs */}
          <div
            style={{
              display: "flex",
              background: "#f9fafb",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
            }}
          >
            {["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED", "ALL"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "5px 12px",
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

          {/* Severity Tabs */}
          <div
            style={{
              display: "flex",
              background: "#f9fafb",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
            }}
          >
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: severityFilter === sev ? (severityBg[sev] || "#fff") : "transparent",
                  color: severityFilter === sev ? (severityColors[sev] || "#2563eb") : "#64748b",
                  boxShadow: severityFilter === sev ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {sev}
              </button>
            ))}
          </div>
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
          Loading live supply chain alerts...
        </div>
      ) : alerts.length === 0 ? (
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
          <CheckCircle size={36} style={{ color: "#bbf7d0", marginBottom: "12px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>No alerts found</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            All parameters are operating within standard thresholds.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {alerts.map((alert) => {
            const color = severityColors[alert.severity] || "#6b7280";
            const isLoadingItem = actionLoadingId === alert.id;

            return (
              <div
                key={alert.id}
                style={{
                  background: "#fff",
                  border: `1px solid ${severityBorder[alert.severity] || "#e5e7eb"}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: "14px",
                  padding: "18px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "18px",
                  flexWrap: "wrap",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color,
                        background: severityBg[alert.severity] || "#f9fafb",
                        border: `1px solid ${severityBorder[alert.severity] || "#e5e7eb"}`,
                        padding: "2px 7px",
                        borderRadius: "6px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {alert.severity}
                    </span>
                    {alert.entity_type && (
                      <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                        [{alert.entity_type}]
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 5px", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                    {alert.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                    {alert.message}
                  </p>

                  {alert.evidence && Object.keys(alert.evidence).length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "8px 12px",
                        background: "#f9fafb",
                        border: "1px solid #f1f5f9",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "#64748b",
                        display: "inline-block",
                      }}
                    >
                      {JSON.stringify(alert.evidence)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {alert.status === "OPEN" && (
                    <>
                      <button
                        disabled={isLoadingItem}
                        onClick={() => handleAction(alert.id, "acknowledge")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Acknowledge
                      </button>
                      <button
                        disabled={isLoadingItem}
                        onClick={() => handleAction(alert.id, "resolve")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#16a34a",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Resolve
                      </button>
                      <button
                        disabled={isLoadingItem}
                        onClick={() => handleAction(alert.id, "dismiss")}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Dismiss
                      </button>
                    </>
                  )}

                  {alert.status === "ACKNOWLEDGED" && (
                    <>
                      <span style={{ fontSize: "12px", color: "#d97706", fontWeight: 600, marginRight: "4px" }}>
                        Acknowledged
                      </span>
                      <button
                        disabled={isLoadingItem}
                        onClick={() => handleAction(alert.id, "resolve")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#16a34a",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Resolve
                      </button>
                    </>
                  )}

                  {alert.status === "RESOLVED" && (
                    <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={14} /> Resolved
                    </span>
                  )}

                  {alert.status === "DISMISSED" && (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Dismissed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
