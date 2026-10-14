const SKELETON_CARDS = 6;

/**
 * Route loading state, shaped like the dashboard so the swap-in does not
 * shift layout: header row, hero block, headline row, then the card grid.
 * Announced to assistive tech once (role="status") instead of leaving a
 * silent blank screen, and still under reduced motion (shimmer + pulse are
 * killed globally there).
 */
export default function Loading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6"
      role="status"
      aria-label="Loading dashboard"
    >
      <span className="sr-only">Loading dashboard…</span>
      <div className="flex items-center justify-between gap-3" aria-hidden="true">
        <div className="skeleton-shimmer h-6 w-44 animate-pulse rounded-lg bg-white/10" />
        <div className="skeleton-shimmer h-8 w-32 animate-pulse rounded-full bg-white/10" />
      </div>

      <div
        className="skeleton-shimmer mt-4 h-[26vh] min-h-[190px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/5"
        aria-hidden="true"
      />

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-16 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div
            key={i}
            className="skeleton-shimmer aspect-square animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    </main>
  );
}
