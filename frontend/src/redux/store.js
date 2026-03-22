import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "@reduxjs/toolkit";
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import userReducer from "./userSlice.js";
import messageReducer from "./messageSlice.js";
import playbackReducer from "./playbackSlice.js";
import roomsReducer from "./roomsSlice.js";

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  /** Only persist auth + inbox metadata; messages load per chat from API + socket. */
  whitelist: ["user"],
};

const rootReducer = combineReducers({
  user: userReducer,
  messages: messageReducer,
  playback: playbackReducer,
  rooms: roomsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export default store;
