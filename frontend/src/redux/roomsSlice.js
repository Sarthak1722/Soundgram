import { createSlice } from "@reduxjs/toolkit";

/**
 * Group jam rooms (API list) + which context drives shared playback (DM or group).
 * @typedef {{ kind: 'dm', peerId: string, label: string } | { kind: 'group', roomId: string, label: string, groupId: string }} ActiveJam
 */
const initialState = {
  list: [],
  activeJam: null,
};

const roomsSlice = createSlice({
  name: "rooms",
  initialState,
  reducers: {
    setRoomsList: (state, action) => {
      state.list = Array.isArray(action.payload) ? action.payload : [];
    },
    setActiveJam: (state, action) => {
      state.activeJam = action.payload;
    },
    clearActiveJam: (state) => {
      state.activeJam = null;
    },
    resetRooms: () => ({ ...initialState }),
  },
});

export const { setRoomsList, setActiveJam, clearActiveJam, resetRooms } = roomsSlice.actions;

export default roomsSlice.reducer;
