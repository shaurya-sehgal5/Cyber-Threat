import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const getHealth = () => api.get("/health");
export const getDashboardStats = () => api.get("/dashboard/stats");
export const getAlerts = () => api.get("/alerts");
export const getLogs = () => api.get("/logs");
export const getDetectionHistory = () => api.get("/detections/history");

export default api;
