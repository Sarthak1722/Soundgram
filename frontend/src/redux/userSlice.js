import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',
  initialState: {
    authUser: null,
    otherUsers: [],
    selectedUser: null,
    onlineUsers: null,
    authStatus: "idle",
  },
  reducers: {
    setauthUser: (state, action)=>{
      state.authUser = action.payload
      if (!action.payload) {
        state.selectedUser = null;
      }
    },
    setotherUsers: (state, action)=>{
      state.otherUsers = action.payload
    },
    setselectedUser: (state, action)=>{
      state.selectedUser = action.payload
    },
    setonlineUsers: (state, action)=>{
      state.onlineUsers = action.payload
    },
    setAuthStatus: (state, action) => {
      state.authStatus = action.payload;
    },
  },
});

export const {setauthUser, setotherUsers, setselectedUser, setonlineUsers, setAuthStatus} = userSlice.actions;

export default userSlice.reducer;
