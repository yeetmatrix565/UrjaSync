import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="glass max-w-sm p-6 text-center">
        <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-cyan-300">
          404
        </h1>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-white/50">
          No such page in this dashboard.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:border-cyan-300/40 hover:text-cyan-200"
        >
          back to dashboard
        </Link>
      </div>
    </main>
  );
}
