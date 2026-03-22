import { playlists } from "../data/libraryMock.js";
import { IoAdd, IoMusicalNotes } from "react-icons/io5";

const PlaylistsPage = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="border-b border-white/[0.06] px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Your library</h1>
            <p className="mt-1 text-sm text-zinc-400">Playlists you create or follow will show here</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-zinc-100"
          >
            <IoAdd className="text-lg" />
            New playlist
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br text-left shadow-lg transition hover:border-white/[0.14] hover:shadow-xl ${p.gradient}`}
            >
              <div className="flex flex-1 flex-col justify-between p-6">
                <IoMusicalNotes className="text-3xl text-white/40" />
                <div>
                  <h2 className="text-lg font-bold text-white">{p.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-white/70">{p.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/50">
                    {p.trackCount} tracks
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaylistsPage;
