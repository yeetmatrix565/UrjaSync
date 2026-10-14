import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="glass w-full max-w-sm p-6 text-center sm:p-8">
        <h1 className="font-mono text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
          404
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          No such page in this dashboard.
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/50">
          The link may be mistyped, or the screen may have moved.
        </p>
        <Link
          href="/"
          className="focus-ring mt-5 inline-flex min-h-10 items-center rounded-full border border-white/15 bg-white/5 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:border-cyan-300/40 hover:text-cyan-200 active:scale-[0.98]"
        >
          back to dashboard
        </Link>
      </div>
    </main>
  );
}
