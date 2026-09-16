import { cn } from "@/lib/cn";

interface ContainerProps {
  /** Extra classes for the inner (column-width) box, e.g. vertical padding
   *  or a background that should stop at the column's edges. */
  className?: string;
  children: React.ReactNode;
}

/**
 * The page's **Content column**: the single horizontal box every content row
 * on /landing-new lines up with — 1140px wide, centred, i.e. 150px gutters at
 * the 1440px design width (Figma node 1360:8704 "Layout", squared up; see
 * docs/adr/0003-page-content-column.md for why the design's own per-frame x
 * positions are overridden).
 *
 * Figma hand-places each row, so the frames sit on five different left edges
 * (80 / 150 / 156 / 160 / 184.5). This component is the one place that decides
 * the edge; a section's job is only to fill it. **A new section wraps its
 * content in `Container` rather than inventing its own gutter** — whatever is
 * the leftmost *painted* pixel of the row (a card's surface, or bare text on
 * the sky) then sits on the column's edge.
 *
 * The two nested boxes are not decorative. The column has to stay a fraction
 * of the viewport so the whole page scales down together between `lg` and
 * 1440px (the model every section here uses — see LandingHero), while still
 * capping at the 1440px design width. Doing that with one box and
 * `lg:px-[10.41667%]` would break above 1440px: a padding percentage resolves
 * against the *containing block*, not against the `max-w`-capped box, so at a
 * 1600px viewport the gutters would grow to 166.7px and the column would come
 * out 1107px instead of 1140px. Splitting it means the inner `lg:w-` resolves
 * against the outer box's padding-free content width, which is exactly
 * `min(viewport, 1440)` — 1140px at 1440px and above, scaling below it.
 *
 * That same percentage-base rule is what any child inside here has to respect:
 * a percentage resolves against its own parent's content box, so a number
 * written as a fraction of 1440 is wrong the moment an ancestor carries
 * padding. Children of the column are fractions of **1140**.
 *
 * Below `lg` the column is the full width, inside the simple page gutter the
 * other routes already use (Figma has no mobile frame).
 */
export default function Container({ className, children }: ContainerProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-0">
      <div className={cn("mx-auto w-full lg:w-[79.16667%]", className)}>{children}</div>
    </div>
  );
}
