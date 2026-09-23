/**
 * AI Supply Chain Intelligence API Service
 * ==========================================
 * All AI endpoints under /api/ai/*
 * Mirrors the backend ai_router.py exactly.
 *
 * Uses the configured `api` instance (not raw axios) so the JWT Bearer
 * token is automatically attached to every request.
 */
import api from "./api";

const BASE = "/api/ai";

const aiApi = {
  // ── Status ─────────────────────────────────────────────────────────────
  getStatus: () => api.get(`${BASE}/status`),

  // ── Inventory Intelligence ──────────────────────────────────────────────
  getInventoryHealth: () => api.get(`${BASE}/inventory/health`),
  getInventoryRisk: (limit = 50) =>
    api.get(`${BASE}/inventory/risk`, { params: { limit } }),
  getProductIntelligence: (productId) =>
    api.get(`${BASE}/inventory/${productId}/intelligence`),

  // ── Demand Forecasting ─────────────────────────────────────────────────
  getProductForecast: (productId, horizonDays = 30, forceRetrain = false) =>
    api.get(`${BASE}/forecasting/${productId}`, {
      params: { horizon_days: horizonDays, force_retrain: forceRetrain },
    }),
  runAllForecasts: () => api.post(`${BASE}/forecasting/run-all`),

  // ── Alerts ─────────────────────────────────────────────────────────────
  getAlerts: ({ status, severity, entityType, limit = 50, offset = 0 } = {}) =>
    api.get(`${BASE}/alerts`, {
      params: { status, severity, entity_type: entityType, limit, offset },
    }),
  updateAlert: (alertId, action) =>
    api.patch(`${BASE}/alerts/${alertId}`, { action }),

  // ── Anomalies ──────────────────────────────────────────────────────────
  getAnomalies: (entityType, limit = 50) =>
    api.get(`${BASE}/anomalies`, { params: { entity_type: entityType, limit } }),
  triggerAnomalyDetection: () => api.post(`${BASE}/anomalies/detect`),

  // ── Customer Intelligence ──────────────────────────────────────────────
  getSegmentSummary: () => api.get(`${BASE}/customers/segments/summary`),
  getCustomerIntelligence: (userId) =>
    api.get(`${BASE}/customers/${userId}/intelligence`),
  getAtRiskCustomers: (limit = 50) =>
    api.get(`${BASE}/customers/at-risk`, { params: { limit } }),
  updateCustomerIntelligence: () =>
    api.post(`${BASE}/customers/update-intelligence`),

  // ── Recommendations ────────────────────────────────────────────────────
  getRecommendations: (status = "PENDING", limit = 50) =>
    api.get(`${BASE}/recommendations`, { params: { status, limit } }),
  reviewRecommendation: (recId, action, rejectionReason = null) =>
    api.patch(`${BASE}/recommendations/${recId}/review`, {
      action,
      rejection_reason: rejectionReason,
    }),

  // ── Jobs ───────────────────────────────────────────────────────────────
  getJobStatus: () => api.get(`${BASE}/jobs/status`),
  triggerJob: (jobName) => api.post(`${BASE}/jobs/trigger/${jobName}`),

  // ── Models ─────────────────────────────────────────────────────────────
  listModels: () => api.get(`${BASE}/models`),
};

export default aiApi;
