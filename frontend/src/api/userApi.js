import apiClient from "./client.js";

export async function fetchUserProfile(userId) {
  const { data } = await apiClient.get(`/api/v1/user/profile/${userId}`);
  return data.user;
}

export async function addFriend(userId) {
  const { data } = await apiClient.post(`/api/v1/user/friends/${userId}`);
  return data.user;
}

export async function removeFriend(userId) {
  const { data } = await apiClient.delete(`/api/v1/user/friends/${userId}`);
  return data.user;
}
