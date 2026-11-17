import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

export const getHealth = () => api.get("/health");
export const getDashboardStats = () => api.get("/dashboard/stats");
export const getAlerts = () => api.get("/alerts");
export const getAlert = (id) => api.get(`/alerts/${encodeURIComponent(id)}`);
export const updateAlertStatus = (id, status, note) => api.patch(`/alerts/${encodeURIComponent(id)}/status`, { status, note });
export const getLogs = () => api.get("/logs?limit=100");
export const getDetectionHistory = () => api.get("/detections/history");
export const runDetection = () => api.post("/detections/run");
export const uploadLogs = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/logs/upload", form);
};
export default api;
