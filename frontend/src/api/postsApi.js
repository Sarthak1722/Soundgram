import apiClient from "./client.js";

export async function fetchFeedPosts() {
  const { data } = await apiClient.get("/api/v1/posts/feed");
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function fetchMyPosts() {
  const { data } = await apiClient.get("/api/v1/posts/me");
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function fetchUserPosts(userId) {
  const { data } = await apiClient.get(`/api/v1/posts/user/${userId}`);
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function createProfilePost({ caption, mediaFile }) {
  const formData = new FormData();
  formData.append("caption", caption || "");
  formData.append("media", mediaFile);

  const { data } = await apiClient.post("/api/v1/posts", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data.post;
}

export async function toggleLikeOnPost(postId) {
  const { data } = await apiClient.post(`/api/v1/posts/${postId}/like`);
  return data.post;
}

export async function addCommentToPost(postId, text) {
  const { data } = await apiClient.post(`/api/v1/posts/${postId}/comment`, { text });
  return data.post;
}

export async function updatePostCaption(postId, caption) {
  const { data } = await apiClient.put(`/api/v1/posts/${postId}`, { caption });
  return data.post;
}

export async function deletePost(postId) {
  const { data } = await apiClient.delete(`/api/v1/posts/${postId}`);
  return data;
}
