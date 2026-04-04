import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicOnlyRoute = () => {
  const { authUser, authStatus } = useSelector((store) => store.user);

  if (authStatus === "idle" || authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
          <p className="mt-4 text-sm text-zinc-300">Preparing Jamify…</p>
        </div>
      </div>
    );
  }

  if (authUser?._id) {
    return <Navigate to="/homepage/home" replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
