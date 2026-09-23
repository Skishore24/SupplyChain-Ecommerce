import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, RefreshCw, AlertTriangle, Zap, Target } from "lucide-react";
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

export default function AnomalyDetectionPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [error, setError] = useState(null);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiApi.getAnomalies(
        entityFilter === "ALL" ? undefined : entityFilter,
        100
      );
      setAnomalies(res.data?.anomalies || []);
    } catch (err) {
      console.error("Failed to load anomalies:", err);
      setError("Failed to fetch anomalies. Backend may be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [entityFilter]);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await aiApi.triggerAnomalyDetection();
      setScanMessage(
        res.data?.message ||
        `Anomaly scan finished. ${res.data?.new_anomalies_detected ?? 0} new anomalies recorded.`
      );
      setTimeout(() => {
        setScanMessage(null);
        fetchAnomalies();
      }, 4000);
    } catch (err) {
      setScanMessage("Anomaly scan failed to run.");
    } finally {
      setScanning(false);
    }
  };

  const filtered = anomalies.filter((a) => {
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
    return true;
  });

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
                  background: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(139,92,246,0.25)",
                }}
              >
                <Activity size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                  Autonomous Anomaly Detection
                </h1>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Statistical outlier detection (Z-scores, IQR, sudden velocity shifts) with explainable trails
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {scanMessage && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#16a34a",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                {scanMessage}
              </span>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid #ddd6fe",
                background: "#ede9fe",
                color: "#7c3aed",
                cursor: scanning ? "wait" : "pointer",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Zap size={13} />
              {scanning ? "Scanning Dataset..." : "Run Real-Time Scan"}
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ display: "flex", gap: "14px", marginTop: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#f9fafb", padding: "3px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            {["ALL", "PRODUCT", "SUPPLIER", "INVENTORY"].map((e) => (
              <button
                key={e}
                onClick={() => setEntityFilter(e)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: entityFilter === e ? "#fff" : "transparent",
                  color: entityFilter === e ? "#7c3aed" : "#64748b",
                  boxShadow: entityFilter === e ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {e}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", background: "#f9fafb", padding: "3px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: severityFilter === s ? (severityBg[s] || "#fff") : "transparent",
                  color: severityFilter === s ? (severityColors[s] || "#7c3aed") : "#64748b",
                  boxShadow: severityFilter === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
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
          Scanning time-series distributions for statistical deviations...
        </div>
      ) : filtered.length === 0 ? (
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
          <Target size={36} style={{ color: "#ddd6fe", marginBottom: "12px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>No Anomaly Events Recorded</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            All sales velocities and inventory metrics align with historical confidence bounds.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map((item) => {
            const color = severityColors[item.severity] || "#6b7280";
            return (
              <div
                key={item.id}
                style={{
                  background: "#fff",
                  border: `1px solid ${severityBorder[item.severity] || "#e5e7eb"}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: "14px",
                  padding: "18px 22px",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color,
                          background: severityBg[item.severity] || "#f9fafb",
                          border: `1px solid ${severityBorder[item.severity] || "#e5e7eb"}`,
                          padding: "2px 7px",
                          borderRadius: "6px",
                        }}
                      >
                        {item.severity}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: "6px" }}>
                        {item.anomaly_type}
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {item.entity_type} #{item.entity_id}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {new Date(item.detected_at || item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                      {item.description || `${item.anomaly_type} detected on ${item.entity_type}`}
                    </h3>
                  </div>

                  {/* Z-Score */}
                  <div
                    style={{
                      textAlign: "right",
                      background: severityBg[item.severity] || "#f9fafb",
                      border: `1px solid ${severityBorder[item.severity] || "#e5e7eb"}`,
                      borderRadius: "10px",
                      padding: "10px 16px",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Z-Score / Deviation
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color, marginTop: "2px" }}>
                      {item.score !== undefined
                        ? `${item.score > 0 ? "+" : ""}${item.score.toFixed(2)}σ`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Evidence Panel */}
                {item.evidence && Object.keys(item.evidence).length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px 16px",
                      background: "#f9fafb",
                      border: "1px solid #f1f5f9",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#374151",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "20px",
                    }}
                  >
                    {item.evidence.baseline_mean !== undefined && (
                      <div>
                        <span style={{ color: "#64748b" }}>Baseline Mean: </span>
                        <span style={{ fontWeight: 600 }}>{Number(item.evidence.baseline_mean).toFixed(2)}</span>
                      </div>
                    )}
                    {item.evidence.observed_value !== undefined && (
                      <div>
                        <span style={{ color: "#64748b" }}>Observed Value: </span>
                        <span style={{ fontWeight: 600, color }}>{Number(item.evidence.observed_value).toFixed(2)}</span>
                      </div>
                    )}
                    {item.evidence.ratio !== undefined && (
                      <div>
                        <span style={{ color: "#64748b" }}>Velocity Shift: </span>
                        <span style={{ fontWeight: 600 }}>{(Number(item.evidence.ratio) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
