import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { IoArrowBack, IoRefresh } from "react-icons/io5";

const RouteErrorBoundary = () => {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";
  const message = isRouteErrorResponse(error)
    ? error.data?.message || "This route could not be loaded."
    : error instanceof Error
      ? error.message
      : "An unexpected error interrupted the experience.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,16,18,0.96),rgba(9,9,10,0.98))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Route error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-400">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
          >
            <IoRefresh />
            Reload app
          </button>
          <Link
            to="/homepage/home"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
          >
            <IoArrowBack />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
