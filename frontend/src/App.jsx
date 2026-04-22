import "./App.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import AppLoadingScreen from "./components/app/AppLoadingScreen.jsx";
import RouteErrorBoundary from "./components/app/RouteErrorBoundary.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import { useChatSocket } from "./hooks/useChatSocket.js";
import apiClient from "./api/client.js";
import { setAuthStatus, setauthUser } from "./redux/userSlice.js";

const Homepage = lazy(() => import("./components/Homepage.jsx"));
const Signup = lazy(() => import("./components/Signup.jsx"));
const Login = lazy(() => import("./components/Login.jsx"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage.jsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const MessagesPage = lazy(() => import("./pages/MessagesPage.jsx"));
const LikedMusicPage = lazy(() => import("./pages/LikedMusicPage.jsx"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage.jsx"));
const PlaylistDetailPage = lazy(() => import("./pages/PlaylistDetailPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

const withSuspense = (node, label) => (
  <Suspense fallback={<AppLoadingScreen label={label} />}>
    {node}
  </Suspense>
);

const router = createBrowserRouter([
  { path: "/Homepage", element: <Navigate to="/homepage" replace />, errorElement: <RouteErrorBoundary /> },
  {
    element: withSuspense(<PublicOnlyRoute />, "Preparing authentication…"),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: withSuspense(<Login />, "Loading sign in…"),
      },
      {
        path: "/register",
        element: withSuspense(<Signup />, "Loading sign up…"),
      },
    ],
  },
  {
    element: withSuspense(<ProtectedRoute />, "Checking access…"),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/homepage",
        element: withSuspense(<Homepage />, "Loading workspace…"),
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: withSuspense(<DiscoverPage />, "Loading home…") },
          { path: "search", element: withSuspense(<SearchPage />, "Loading search…") },
          { path: "notifications", element: withSuspense(<NotificationsPage />, "Loading notifications…") },
          { path: "messages", element: withSuspense(<MessagesPage />, "Loading messages…") },
          { path: "rooms", element: <Navigate to="/homepage/messages" replace /> },
          { path: "profile", element: withSuspense(<ProfilePage />, "Loading profile…") },
          { path: "profile/:userId", element: withSuspense(<ProfilePage />, "Loading profile…") },
          { path: "songs", element: withSuspense(<LikedMusicPage />, "Loading songs…") },
          { path: "liked", element: <Navigate to="/homepage/songs" replace /> },
          { path: "playlists", element: withSuspense(<PlaylistsPage />, "Loading playlists…") },
          { path: "playlists/:id", element: withSuspense(<PlaylistDetailPage />, "Loading playlist…") },
        ],
      },
    ],
  },
]);

function App() {
  const dispatch = useDispatch();
  const [sessionReady, setSessionReady] = useState(false);
  useChatSocket();

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      dispatch(setAuthStatus("checking"));

      try {
        const { data } = await apiClient.get("/api/v1/user/me");
        if (cancelled) return;
        dispatch(setauthUser(data.user));
        dispatch(setAuthStatus("authenticated"));
      } catch {
        if (cancelled) return;
        dispatch(setauthUser(null));
        dispatch(setAuthStatus("unauthenticated"));
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!sessionReady) {
    return <AppLoadingScreen label="Checking your session…" />;
  }

  return (
    <RouterProvider router={router} />
  );
}

export default App;
