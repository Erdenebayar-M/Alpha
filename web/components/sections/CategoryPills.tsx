import { categoryPills } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * /landing-new's Category pills (Figma node 1360:8718), sitting 30px below
 * the Hero Card's bottom edge (Hero Card bottom is absolute y=638 in the
 * artwork frame, this row's top is y=668). Унших, Зөв бичих and Үсэглэх
 * link to their Category placeholder; Оношилгоо is a Diagnostic shortcut,
 * not a Category (see CONTEXT.md) — data and hrefs live in lib/content.ts /
 * lib/site-config.ts, rendered here with one map.
 *
 * The row's natural width (4*260 + 3*10 = 1070px) is wider than the `lg`
 * breakpoint (1024px), so — like LandingHero — pill width and gap are
 * percentages of the 1440px reference (260/1440 = 18.056%, 10/1440 =
 * 0.694%) instead of fixed px: the row scales down between `lg` and 1440px
 * instead of overflowing, reaching Figma's exact pixels once it reaches its
 * natural 1440px width. The anchor's own horizontal padding is a percentage
 * of *its* containing block (the li, i.e. the pill's own current width) —
 * 30/260 = 11.538% — so it shrinks in step with the pill and keeps the same
 * proportion of text-box to padding as the row scales, instead of a fixed
 * 30px eating a growing share of a shrinking pill and wrapping "Оношилгоо"
 * early. Figma has no mobile frame, so below `lg` this becomes a 2x2 CSS
 * grid instead, sized to fit 320px.
 */
export default function CategoryPills() {
  return (
    <nav
      aria-label={categoryPills.navLabel}
      className="relative isolate px-5 pt-8 pb-10 md:px-10 lg:px-0 lg:pt-[30px] lg:pb-[45px]"
    >
      <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-[10px] lg:flex lg:justify-center lg:gap-[0.694%]">
        {categoryPills.items.map((pill) => (
          <li key={pill.label} className="lg:w-[18.056%]">
            <a
              href={pill.href}
              className={cn(
                "focus-ring flex min-h-[72px] items-center justify-center rounded-[24px] bg-pill-lilac px-4 py-4 text-center text-base leading-snug font-bold text-hero-ink transition-[filter] duration-150 hover:brightness-95",
                "lg:h-[85px] lg:min-h-0 lg:rounded-[32px] lg:px-[11.538%] lg:py-[16px] lg:text-[26px] lg:leading-[31px]"
              )}
            >
              {pill.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
