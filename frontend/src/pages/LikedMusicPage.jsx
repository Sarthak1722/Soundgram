import { likedTracks } from "../data/libraryMock.js";
import { IoHeart, IoTimeOutline } from "react-icons/io5";

const LikedMusicPage = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-emerald-900/20 to-transparent px-8 py-8">
        <div className="mx-auto flex max-w-5xl items-end gap-6">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-800 shadow-2xl shadow-emerald-950/50">
            <IoHeart className="text-6xl text-white/90 drop-shadow-lg" />
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Playlist
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl">
              Liked Songs
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {likedTracks.length} songs · Frontend preview (no API yet)
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex gap-3 border-b border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="w-8 shrink-0 text-center">#</span>
            <span className="min-w-0 flex-1">Title</span>
            <span className="hidden min-w-0 flex-1 sm:block">Album</span>
            <span className="flex w-14 shrink-0 items-center justify-end">
              <IoTimeOutline className="text-base" />
            </span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {likedTracks.map((track, i) => (
              <li
                key={track.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/[0.06]"
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">
                  <span className="tabular-nums group-hover:invisible">{i + 1}</span>
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center text-emerald-400 opacity-0 transition group-hover:opacity-100"
                    aria-label={`Play ${track.title}`}
                  >
                    ▶
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`h-10 w-10 shrink-0 rounded bg-gradient-to-br ${track.gradient} shadow-md`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                  </div>
                </div>
                <p className="hidden min-w-0 flex-1 truncate text-zinc-400 sm:block">{track.album}</p>
                <p className="w-14 shrink-0 text-right tabular-nums text-zinc-500">{track.duration}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LikedMusicPage;
