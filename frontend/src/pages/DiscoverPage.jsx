import { Link } from "react-router-dom";
import { discoverStories } from "../data/libraryMock.js";
import { IoPlay, IoMusicalNotes } from "react-icons/io5";

const cards = [
  {
    title: "Made for you",
    subtitle: "Daily mixes based on what you play",
    tone: "from-emerald-600/30 to-teal-900/40",
  },
  {
    title: "Trending near you",
    subtitle: "What your network is looping",
    tone: "from-fuchsia-600/25 to-violet-900/40",
  },
  {
    title: "Continue chatting",
    subtitle: "Pick up your last conversation",
    tone: "from-sky-600/25 to-indigo-900/40",
    to: "/homepage/messages",
  },
];

const DiscoverPage = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0a]/80 px-8 py-6 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">Home</h1>
        <p className="mt-1 text-sm text-zinc-400">Stories, picks, and quick actions</p>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Stories
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {discoverStories.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex shrink-0 flex-col items-center gap-2 text-center"
              >
                <div
                  className={`rounded-full bg-gradient-to-tr p-[2px] ${s.ring}`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111] ring-4 ring-[#0a0a0a]">
                    <IoMusicalNotes className="text-xl text-zinc-500" />
                  </div>
                </div>
                <span className="max-w-[72px] truncate text-xs text-zinc-300">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            For you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => {
              const inner = (
                <article
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br p-6 ${c.tone} transition hover:border-white/[0.14]`}
                >
                  <IoPlay className="absolute -right-2 -top-2 text-7xl text-white/[0.07] transition group-hover:text-white/10" />
                  <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{c.subtitle}</p>
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-emerald-400 opacity-0 transition group-hover:opacity-100">
                    Open →
                  </span>
                </article>
              );
              return c.to ? (
                <Link key={c.title} to={c.to} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={c.title}>{inner}</div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DiscoverPage;
