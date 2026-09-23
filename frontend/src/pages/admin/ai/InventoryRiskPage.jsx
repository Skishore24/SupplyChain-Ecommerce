import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, ArrowLeft, RefreshCw, AlertTriangle, Search, X, FlaskConical, TrendingUp } from "lucide-react";
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

export default function InventoryRiskPage() {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [riskItems, setRiskItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [onlyReorder, setOnlyReorder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthRes, riskRes] = await Promise.allSettled([
        aiApi.getInventoryHealth(),
        aiApi.getInventoryRisk(100),
      ]);

      if (healthRes.status === "fulfilled") setHealthData(healthRes.value.data);
      if (riskRes.status === "fulfilled") setRiskItems(riskRes.value.data.items || []);
    } catch (err) {
      console.error("Failed to load inventory intelligence:", err);
      setError("Failed to load inventory intelligence. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openProductDetail = async (productId) => {
    setSelectedProduct(productId);
    setDetailLoading(true);
    try {
      const res = await aiApi.getProductIntelligence(productId);
      setProductDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch product intelligence:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredItems = riskItems.filter((item) => {
    const matchesSearch =
      !search ||
      (item.product_name && item.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesSeverity = selectedSeverity === "ALL" || item.risk_level === selectedSeverity;
    const matchesReorder = !onlyReorder || item.needs_reorder;
    return matchesSearch && matchesSeverity && matchesReorder;
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
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                }}
              >
                <Package size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                  Inventory Risk & Stockout Prediction
                </h1>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Real-time stockout probability, reorder triggers, and safety stock calculations
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
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

        {/* Health KPI Strip */}
        {healthData && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            {[
              { label: "Avg Health Score", value: `${healthData.avg_inventory_health_score ?? "—"}%`, color: "#6366f1" },
              { label: "Critical Risk", value: healthData.critical_count ?? 0, color: "#dc2626" },
              { label: "High Risk", value: healthData.high_risk_count ?? 0, color: "#ea580c" },
              { label: "Needs Reorder", value: healthData.needs_reorder_count ?? 0, color: "#d97706" },
              { label: "Overstock Alert", value: healthData.overstock_count ?? 0, color: "#2563eb" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
                }}
              >
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color, marginTop: "4px" }}>{value}</div>
              </div>
            ))}
          </div>
        )}
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

      {/* Filter Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "14px 18px",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#111827",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
            <button
              key={level}
              onClick={() => setSelectedSeverity(level)}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                border: selectedSeverity === level
                  ? `1px solid ${severityBorder[level] || "#ddd6fe"}`
                  : "1px solid #e5e7eb",
                background: selectedSeverity === level
                  ? (severityBg[level] || "#eef2ff")
                  : "#f9fafb",
                color: selectedSeverity === level
                  ? (severityColors[level] || "#6366f1")
                  : "#64748b",
                transition: "all 0.15s",
              }}
            >
              {level}
            </button>
          ))}

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", marginLeft: "6px", color: "#374151" }}>
            <input
              type="checkbox"
              checked={onlyReorder}
              onChange={(e) => setOnlyReorder(e.target.checked)}
            />
            Reorder Needed Only
          </label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>
          Analyzing inventory risks and stockout trajectories...
        </div>
      ) : filteredItems.length === 0 ? (
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
          No products matched your criteria.
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
                  {["Product & SKU", "Stock", "Daily Velocity", "Days Left", "Safety Stock", "Reorder Point", "Stockout Risk", "Recommended Order", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: i === 0 ? "13px 20px" : "13px 14px",
                        fontWeight: 700,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        textAlign: i === 8 ? "right" : "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const riskColor = severityColors[item.risk_level] || "#16a34a";
                  return (
                    <tr
                      key={item.product_id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{item.product_name}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>SKU: {item.sku || "N/A"}</div>
                      </td>
                      <td style={{ padding: "13px 14px", fontWeight: 700, color: item.current_stock === 0 ? "#dc2626" : "#111827" }}>
                        {item.current_stock}
                      </td>
                      <td style={{ padding: "13px 14px", color: "#374151" }}>
                        {item.daily_sales_velocity ? item.daily_sales_velocity.toFixed(1) : "0.0"} / day
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: item.days_of_supply !== null && item.days_of_supply <= 7 ? "#dc2626" : "#374151",
                            fontWeight: item.days_of_supply !== null && item.days_of_supply <= 7 ? 700 : 400,
                          }}
                        >
                          {item.days_of_supply !== null ? `${Math.round(item.days_of_supply)} days` : "∞"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px", color: "#64748b" }}>{item.safety_stock ?? "—"}</td>
                      <td style={{ padding: "13px 14px", color: "#64748b" }}>{item.reorder_point ?? "—"}</td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <div style={{ width: "56px", height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.min(item.stockout_risk_score || 0, 100)}%`,
                                height: "100%",
                                background: riskColor,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: riskColor,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: severityBg[item.risk_level] || "#f9fafb",
                            }}
                          >
                            {item.stockout_risk_score ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        {item.needs_reorder ? (
                          <span style={{ color: "#d97706", fontWeight: 700 }}>+{item.recommended_order_quantity || 0} units</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Optimal</span>
                        )}
                      </td>
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        <button
                          onClick={() => openProductDetail(item.product_id)}
                          style={{
                            padding: "5px 11px",
                            borderRadius: "8px",
                            border: "1px solid #ddd6fe",
                            background: "#eef2ff",
                            color: "#6366f1",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <FlaskConical size={11} />
                          Inspect AI
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

      {/* Product Detail Modal */}
      {selectedProduct && (
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
          onClick={() => setSelectedProduct(null)}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              maxWidth: "660px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              position: "relative",
              boxShadow: "0 20px 40px -8px rgba(15,23,42,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                color: "#374151",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>

            {detailLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
                Loading mathematical breakdown & explainability...
              </div>
            ) : productDetail ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FlaskConical size={18} style={{ color: "#6366f1" }} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                    {productDetail.product_name || "Product Intelligence"}
                  </h2>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "22px" }}>
                  Product ID: {productDetail.product_id} · SKU: {productDetail.sku || "N/A"}
                </div>

                {/* KPI mini-grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "22px" }}>
                  {[
                    { label: "Current Stock", value: productDetail.current_stock, color: "#111827" },
                    {
                      label: "Stockout Risk",
                      value: `${productDetail.stockout_risk_score}%`,
                      color: severityColors[productDetail.risk_level] || "#6b7280",
                    },
                    {
                      label: "Days of Supply",
                      value: productDetail.days_of_supply !== null ? Math.round(productDetail.days_of_supply) : "∞",
                      color: "#111827",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#f9fafb", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "14px" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px", color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Explainability */}
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #f1f5f9",
                    borderRadius: "12px",
                    padding: "18px",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                    <FlaskConical size={14} style={{ color: "#6366f1" }} />
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#374151" }}>
                      Mathematical Explainability
                    </h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px" }}>
                    {[
                      { label: "Safety Stock (Z × σ × √L):", value: `${productDetail.safety_stock} units` },
                      { label: "Reorder Point (d × L + SS):", value: `${productDetail.reorder_point} units` },
                      { label: "Lead Time Assumed:", value: `${productDetail.lead_time_days || 7} days` },
                      { label: "Daily Sales Velocity:", value: `${productDetail.daily_sales_velocity?.toFixed(2)} units/day` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{value}</span>
                      </div>
                    ))}
                    {productDetail.recommended_order_quantity > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                        <span style={{ color: "#d97706", fontWeight: 700 }}>Recommended Order Quantity:</span>
                        <span style={{ color: "#d97706", fontWeight: 800 }}>+{productDetail.recommended_order_quantity} units</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason Codes */}
                {productDetail.reason_codes && productDetail.reason_codes.length > 0 && (
                  <div style={{ marginBottom: "18px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Risk Reason Flags:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {productDetail.reason_codes.map((code) => (
                        <span
                          key={code}
                          style={{
                            padding: "3px 9px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link
                    to={`/admin/ai/forecasting?product_id=${productDetail.product_id}`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <TrendingUp size={14} />
                    View ML Demand Forecast →
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ color: "#dc2626", fontSize: "14px" }}>Could not load intelligence for this product.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
