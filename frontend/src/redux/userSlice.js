import { createSlice } from '@reduxjs/toolkit'

function normalizeFriend(friend) {
  if (!friend?._id) return null;
  return {
    _id: String(friend._id),
    fullName: friend.fullName || "",
    userName: friend.userName || "",
    profilePhoto: friend.profilePhoto || "",
  };
}

function normalizeAuthUser(user) {
  if (!user?._id) return null;

  const friends = Array.isArray(user.friends)
    ? user.friends.map(normalizeFriend).filter(Boolean)
    : [];
  const friendIds = Array.isArray(user.friendIds)
    ? user.friendIds.map((id) => String(id))
    : friends.map((friend) => String(friend._id));

  return {
    ...user,
    _id: String(user._id),
    fullName: user.fullName || "",
    userName: user.userName || "",
    profilePhoto: user.profilePhoto || "",
    friends,
    friendIds,
    friendCount: typeof user.friendCount === "number" ? user.friendCount : friendIds.length,
  };
}

function normalizeDirectoryUser(user) {
  if (!user?._id) return null;
  return {
    ...user,
    _id: String(user._id),
    fullName: user.fullName || "",
    userName: user.userName || "",
    profilePhoto: user.profilePhoto || "",
    isFriend: Boolean(user.isFriend),
  };
}

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
      state.authUser = normalizeAuthUser(action.payload)
      if (!action.payload) {
        state.selectedUser = null;
      } else if (
        state.selectedUser?._id &&
        !state.authUser.friendIds.includes(String(state.selectedUser._id))
      ) {
        state.selectedUser = null;
      }
    },
    setotherUsers: (state, action)=>{
      state.otherUsers = Array.isArray(action.payload)
        ? action.payload.map(normalizeDirectoryUser).filter(Boolean)
        : []
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
