const AppLoadingScreen = ({ label = "Loading Jamify…" }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
        <p className="mt-4 text-sm text-zinc-300">{label}</p>
      </div>
    </div>
  );
};

export default AppLoadingScreen;
