import "./App.css";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Homepage from "./components/Homepage";
import Signup from "./components/Signup";
import Login from "./components/Login";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import LikedMusicPage from "./pages/LikedMusicPage.jsx";
import PlaylistsPage from "./pages/PlaylistsPage.jsx";
import RoomsPage from "./pages/RoomsPage.jsx";
import { useChatSocket } from "./hooks/useChatSocket.js";

const router = createBrowserRouter([
  { path: "/Homepage", element: <Navigate to="/homepage" replace /> },
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Signup />,
  },
  {
    path: "/homepage",
    element: <Homepage />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: "home", element: <DiscoverPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "rooms", element: <RoomsPage /> },
      { path: "liked", element: <LikedMusicPage /> },
      { path: "playlists", element: <PlaylistsPage /> },
    ],
  },
]);

function App() {
  useChatSocket();

  return <RouterProvider router={router} />;
}

export default App;