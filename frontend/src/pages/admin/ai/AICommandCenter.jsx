import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  RefreshCw,
  Package,
  AlertTriangle,
  Bell,
  Users,
  TrendingUp,
  Activity,
  Lightbulb,
  CheckCircle,
  Zap,
  Settings2,
  Map,
} from "lucide-react";
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

const StatCard = ({ title, value, subtitle, color, icon: Icon, link }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
      transition: "transform 0.15s, box-shadow 0.15s",
      cursor: link ? "pointer" : "default",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = `0 6px 20px -4px ${color}33`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 3px 0 rgb(0 0 0 / 0.04)";
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ fontSize: "28px", fontWeight: 800, color, marginTop: "6px", lineHeight: 1 }}>
          {value ?? "—"}
        </div>
        {subtitle && (
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "10px",
          borderRadius: "12px",
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Icon && <Icon size={22} style={{ color }} />}
      </div>
    </div>
    {link && (
      <Link
        to={link}
        style={{ color, fontSize: "12px", fontWeight: 600, textDecoration: "none", marginTop: "2px" }}
      >
        View details →
      </Link>
    )}
  </div>
);

const AlertRow = ({ alert, onAcknowledge }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "12px 16px",
      background: severityBg[alert.severity] || "#f9fafb",
      borderRadius: "10px",
      borderLeft: `3px solid ${severityColors[alert.severity] || "#94a3b8"}`,
      border: `1px solid ${severityBorder[alert.severity] || "#e5e7eb"}`,
      borderLeftWidth: "3px",
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{alert.title}</div>
      <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
        {alert.entity_name && `${alert.entity_name} · `}
        {new Date(alert.created_at).toLocaleDateString()}
      </div>
    </div>
    <div
      style={{
        padding: "2px 9px",
        borderRadius: "20px",
        fontSize: "10px",
        fontWeight: 700,
        color: severityColors[alert.severity],
        background: "#fff",
        border: `1px solid ${severityBorder[alert.severity] || "#e5e7eb"}`,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {alert.severity}
    </div>
    {alert.status === "OPEN" && (
      <button
        onClick={() => onAcknowledge(alert.id)}
        style={{
          padding: "4px 11px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          background: "#fff",
          color: "#374151",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Acknowledge
      </button>
    )}
  </div>
);

export default function AICommandCenter() {
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [statusRes, healthRes, alertsRes, segRes] = await Promise.allSettled([
        aiApi.getStatus(),
        aiApi.getInventoryHealth(),
        aiApi.getAlerts({ status: "OPEN", limit: 8 }),
        aiApi.getSegmentSummary(),
      ]);

      if (statusRes.status === "fulfilled") setStatus(statusRes.value.data);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value.data);
      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value.data.alerts || []);
      if (segRes.status === "fulfilled") setSegments(segRes.value.data);
      setError(null);
    } catch (e) {
      setError("Unable to load AI platform data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await aiApi.updateAlert(alertId, "acknowledge");
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      console.error("Failed to acknowledge alert:", e);
    }
  };

  const critCount = health?.critical_count ?? 0;
  const highCount = health?.high_risk_count ?? 0;
  const reorderCount = health?.needs_reorder_count ?? 0;
  const healthScore = health?.avg_inventory_health_score ?? null;
  const atRiskCustomers = segments?.at_risk_count ?? 0;
  const highValueCustomers = segments?.high_value_count ?? 0;
  const openAlerts = status?.data_summary?.open_alerts ?? alerts.length;
  const pendingRecs = status?.data_summary?.pending_recommendations ?? 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#111827" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
              }}
            >
              <Cpu size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                AI Command Center
              </h1>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                Supply chain intelligence · Real-time risk monitoring · ML-driven insights
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                fontSize: "13px",
                color: "#16a34a",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              {status ? "Systems Operational" : "Loading..."}
            </div>
            <button
              onClick={fetchAll}
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
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <AlertTriangle size={16} />
          {error} — Make sure the backend is running.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>
          Loading AI platform data...
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <StatCard
              title="Inventory Health"
              value={healthScore !== null ? `${healthScore}%` : "—"}
              subtitle={`${reorderCount} products need reorder`}
              color="#6366f1"
              icon={Package}
              link="/admin/ai/inventory"
            />
            <StatCard
              title="Critical Stock Risk"
              value={critCount + highCount}
              subtitle={`${critCount} critical · ${highCount} high`}
              color="#dc2626"
              icon={AlertTriangle}
              link="/admin/ai/inventory"
            />
            <StatCard
              title="Open Alerts"
              value={openAlerts}
              subtitle={`${pendingRecs} pending recommendations`}
              color="#ea580c"
              icon={Bell}
              link="/admin/ai/alerts"
            />
            <StatCard
              title="At-Risk Customers"
              value={atRiskCustomers}
              subtitle={`${highValueCustomers} high-value customers`}
              color="#d97706"
              icon={Users}
              link="/admin/ai/customers"
            />
            <StatCard
              title="ML Forecasting"
              value={status?.features?.forecasting?.engine ?? "—"}
              subtitle="Demand forecasting engine"
              color="#16a34a"
              icon={TrendingUp}
              link="/admin/ai/forecasting"
            />
          </div>

          {/* Body: Alerts + Feature Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", marginBottom: "28px" }}>
            {/* Alerts Panel */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "22px",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Bell size={16} style={{ color: "#6366f1" }} />
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>Active Alerts</h2>
                </div>
                <Link to="/admin/ai/alerts" style={{ color: "#6366f1", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  View all →
                </Link>
              </div>
              {alerts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 20px",
                    color: "#94a3b8",
                    fontSize: "14px",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <CheckCircle size={28} style={{ color: "#bbf7d0", marginBottom: "10px" }} />
                  <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "14px" }}>No open alerts</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>All systems nominal</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {alerts.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Platform Features */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "18px",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                  <Settings2 size={14} style={{ color: "#6366f1" }} />
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#374151" }}>Platform Features</h3>
                </div>
                {status?.features &&
                  Object.entries(status.features).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "7px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#374151", textTransform: "capitalize" }}>
                        {key.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "8px",
                          color: val.available ? "#16a34a" : "#dc2626",
                          background: val.available ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${val.available ? "#bbf7d0" : "#fecaca"}`,
                        }}
                      >
                        {val.available ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Quick Actions */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "18px",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                  <Zap size={14} style={{ color: "#6366f1" }} />
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#374151" }}>Quick Actions</h3>
                </div>
                {[
                  { label: "Run Anomaly Detection", action: () => aiApi.triggerAnomalyDetection() },
                  { label: "Update Customer Intelligence", action: () => aiApi.updateCustomerIntelligence() },
                  { label: "Run All Forecasts", action: () => aiApi.runAllForecasts() },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={async () => {
                      try {
                        await action();
                        alert(`${label} started in background.`);
                      } catch (e) {
                        alert("Failed to start job.");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 13px",
                      borderRadius: "9px",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      color: "#374151",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      textAlign: "left",
                      marginBottom: "6px",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#eff6ff";
                      e.currentTarget.style.borderColor = "#bfdbfe";
                      e.currentTarget.style.color = "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.color = "#374151";
                    }}
                  >
                    <Zap size={12} style={{ color: "#6366f1", flexShrink: 0 }} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Customer Segments */}
              {segments && (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "18px",
                    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                    <Users size={14} style={{ color: "#6366f1" }} />
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#374151" }}>Customer Segments</h3>
                  </div>
                  {Object.entries(segments.segments || {}).map(([seg, count]) => {
                    const total = segments.total_segmented || 1;
                    const pct = Math.round((count / total) * 100);
                    const segColors = {
                      HIGH_VALUE: "#6366f1", ACTIVE: "#16a34a", REPEAT: "#2563eb",
                      NEW: "#8b5cf6", AT_RISK: "#ea580c", INACTIVE: "#dc2626",
                    };
                    const c = segColors[seg] || "#6b7280";
                    return (
                      <div key={seg} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                          <span style={{ color: "#374151", fontWeight: 600 }}>{seg.replace(/_/g, " ")}</span>
                          <span style={{ color: "#64748b" }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "3px" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: "3px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* AI Module Navigation */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Map size={15} style={{ color: "#6366f1" }} />
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>AI Intelligence Modules</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {[
                { to: "/admin/ai/inventory", icon: Package, label: "Inventory Risk", desc: "Stockout & overstock analysis", color: "#6366f1" },
                { to: "/admin/ai/forecasting", icon: TrendingUp, label: "Demand Forecasting", desc: "ML demand predictions", color: "#2563eb" },
                { to: "/admin/ai/alerts", icon: Bell, label: "Alert Center", desc: "Supply chain alerts", color: "#ea580c" },
                { to: "/admin/ai/customers", icon: Users, label: "Customer Intelligence", desc: "RFM & churn risk", color: "#d97706" },
                { to: "/admin/ai/anomalies", icon: Activity, label: "Anomaly Detection", desc: "Statistical outliers", color: "#8b5cf6" },
                { to: "/admin/ai/recommendations", icon: Lightbulb, label: "Recommendations", desc: "AI action proposals", color: "#16a34a" },
              ].map(({ to, icon: Icon, label, desc, color }) => (
                <Link key={to} to={to} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      padding: "18px",
                      transition: "all 0.15s",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${color}55`;
                      e.currentTarget.style.boxShadow = `0 4px 12px ${color}22`;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "0 1px 3px 0 rgb(0 0 0 / 0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: `${color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827" }}>{label}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
