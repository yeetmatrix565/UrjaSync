export interface SectionHeadingProps {
  title: string;
  hint?: string;
}

/** The small mono caption pair used above each dashboard section. */
export function SectionHeading({ title, hint }: SectionHeadingProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="label-xs">{title}</h2>
      {hint ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
