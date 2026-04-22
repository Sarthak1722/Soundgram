import apiClient from "./client.js";

export async function fetchNotifications() {
  const { data } = await apiClient.get("/api/v1/notifications");
  return Array.isArray(data.notifications) ? data.notifications : [];
}
