interface MetaChipProps {
  label: string;
}

/** One "Үнэлгээ 5-8 минут" style chip: a lilac icon tile + label, hero only.
 *  Both hero chips use the same ring glyph in the design (Figma node "Дүрс").
 *  Figma: tile size-52 (rounded-14 matches --radius-md already), gap-18. */
export default function MetaChip({ label }: MetaChipProps) {
  return (
    <div className="flex items-center gap-[18px]">
      <span
        aria-hidden="true"
        className="flex size-13 shrink-0 items-center justify-center rounded-md bg-surface-lilac"
      >
        <svg viewBox="0 0 24 24" className="size-6 text-brand-indigo" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </span>
      <p className="text-[13px] font-bold text-text-label">{label}</p>
    </div>
  );
}
