import { Link } from "react-router-dom";
import { IoHeadset, IoPulse, IoSparkles } from "react-icons/io5";

const featureItems = [
  "Realtime chat with presence, typing, and read receipts",
  "Shared music playback for DMs and private group jams",
  "Playlists, mood-driven discovery, and a persistent player",
];

const statItems = [
  { label: "Live chats", value: "Instant" },
  { label: "Group jams", value: "Synced" },
  { label: "Mood", value: "Cinematic" },
];

const AuthShell = ({
  eyebrow,
  title,
  description,
  children,
  footerPrompt,
  footerLinkLabel,
  footerLinkTo,
}) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,95,69,0.32),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,76,129,0.22),transparent_24%),linear-gradient(180deg,#050505_0%,#08090a_45%,#050505_100%)]" />
      <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-[-6rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between pb-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-cyan-500 text-lg font-black text-black shadow-[0_20px_40px_rgba(16,185,129,0.28)]">
              J
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight text-white">Jamify</span>
              <span className="block text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                Music meets conversation
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 sm:inline-flex">
            <IoPulse className="text-emerald-400" />
            Authenticated social listening
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <section className="hidden flex-col justify-center rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                <IoSparkles />
                Social music platform
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-white">
                Where chats turn into live listening sessions.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-zinc-300">
                Jamify blends direct messages, private group chats, playlists, and synchronized playback into
                one polished place to hang out.
              </p>

              <div className="mt-8 grid gap-3">
                {featureItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-4"
                  >
                    <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                      <IoHeadset />
                    </span>
                    <p className="text-sm leading-6 text-zinc-200">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mx-auto flex w-full max-w-xl items-center">
              <div className="w-full rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,16,18,0.92),rgba(9,9,10,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                  {eyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-zinc-400">{description}</p>

                <div className="mt-8">{children}</div>

                <p className="mt-6 text-sm text-zinc-400">
                  {footerPrompt}{" "}
                  <Link
                    to={footerLinkTo}
                    className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                  >
                    {footerLinkLabel}
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthShell;
