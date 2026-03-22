import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function listRooms() {
  const { data } = await axios.get(`${API_URL}/api/v1/rooms`, {
    withCredentials: true,
  });
  return Array.isArray(data) ? data : [];
}

export async function createRoom({ name, memberIds }) {
  const { data } = await axios.post(
    `${API_URL}/api/v1/rooms`,
    { name, memberIds },
    { withCredentials: true },
  );
  return data;
}

export async function getRoom(id) {
  const { data } = await axios.get(`${API_URL}/api/v1/rooms/${id}`, {
    withCredentials: true,
  });
  return data;
}
