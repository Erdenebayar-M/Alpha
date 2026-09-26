import Reveal from "@/components/animations/Reveal";
import { revealItem } from "@/components/animations/revealItem";
import Container from "@/components/ui/Container";
import { categoryPills, type Category } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * /landing-new's Category pills (Figma node 1360:8718), sitting 30px below
 * the Hero Card's bottom edge (Hero Card bottom is absolute y=638 in the
 * artwork frame, this row's top is y=668). Унших, Зөв бичих and Үсэглэх
 * link to their Category placeholder; Оношилгоо is a Diagnostic shortcut,
 * not a Category (see CONTEXT.md) — data and hrefs live in lib/content.ts /
 * lib/site-config.ts, rendered here with one map.
 *
 * The row fills the Content column, so the four pills and three gaps are
 * fractions of it rather than of 1440, scaled from Figma's own proportions:
 * Figma's row is 4x260 + 3x10 = 1070 wide, so a pill is 260/1070 = 24.299%
 * and a gap 10/1070 = 0.9346%. Those sum to exactly 100%, so the row fills
 * the column with no slack and needs no centring — in Figma the row is
 * 1070px centred inside the 1139px `Layout` frame, which is one of the
 * mismatched edges the column replaces (see
 * docs/adr/0003-page-content-column.md). Pills therefore render 277px rather
 * than Figma's 260px at the 1440px design width.
 *
 * The anchor's own horizontal padding is a percentage of *its* containing
 * block (the li, i.e. the pill's own current width) — 30/260 = 11.538% — so
 * it shrinks in step with the pill and keeps the same proportion of text-box
 * to padding as the row scales, instead of a fixed 30px eating a growing
 * share of a shrinking pill and wrapping "Оношилгоо" early. Figma has no
 * mobile frame, so below `lg` this becomes a 2x2 CSS grid instead, sized to
 * fit 320px.
 *
 * `current` marks the pill of the Article being read (its own Category) with
 * aria-current and a solid fill; without it every pill renders as before.
 */
export default function CategoryPills({ current }: { current?: Category }) {
  return (
    <nav
      aria-label={categoryPills.navLabel}
      className="relative isolate pt-8 pb-10 lg:pt-[30px] lg:pb-[45px]"
    >
      <Reveal mode="sequence">
        <Container>
          <ul className="grid grid-cols-2 gap-[10px] lg:flex lg:gap-[0.9346%]">
            {categoryPills.items.map((pill, index) => {
              const isCurrent =
                current !== undefined &&
                "category" in pill &&
                pill.category === current;
              return (
                <li
                  key={pill.label}
                  className="lg:w-[24.299%]"
                  {...revealItem("slide", index)}
                >
                  <a
                    href={pill.href}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "focus-ring flex min-h-[72px] items-center justify-center rounded-[24px] px-4 py-4 text-center text-base leading-snug font-bold text-hero-ink transition-[filter] duration-150 hover:brightness-95",
                      isCurrent ? "bg-pill-lilac-current" : "bg-pill-lilac",
                      "lg:h-[85px] lg:min-h-0 lg:rounded-[32px] lg:px-[11.538%] lg:py-[16px] lg:text-[26px] lg:leading-[31px]",
                    )}
                  >
                    {pill.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </Container>
      </Reveal>
    </nav>
  );
}
