const SKELETON_CARDS = 6;

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="mt-3 h-[45vh] min-h-[290px] w-full animate-pulse rounded-3xl border border-white/10 bg-white/5" />

      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    </main>
  );
}
