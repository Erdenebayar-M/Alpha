import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import ArrowIcon from "@/components/ui/ArrowIcon";

type ButtonVariant =
  | "cta"
  | "navOutline"
  | "navSolid"
  | "navOutlineLg"
  | "navSolidLg"
  | "pricingOutline"
  | "pricingSolid"
  | "setupNext"
  | "taskNext";

interface BaseProps {
  variant: ButtonVariant;
  children: ReactNode;
  className?: string;
}

type ButtonProps =
  | (BaseProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">)
  | (BaseProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">);

const base =
  "inline-flex items-center justify-center gap-2.5 font-extrabold transition-[transform,box-shadow,background-color] duration-150 ease-press focus-ring";

const variants: Record<ButtonVariant, string> = {
  cta: "group w-full h-20 rounded-xl bg-brand-green border-b-[3px] border-brand-green-edge px-[30px] py-4 text-base font-black text-white shadow-card hover:-translate-y-px active:translate-y-px active:duration-75",
  navOutline:
    "min-h-11 rounded-sm border border-border-card bg-white px-3.5 py-2 text-sm font-black text-text-nav-strong hover:bg-surface-lilac/60 lg:h-[34px] lg:min-h-0 lg:text-[13px]",
  navSolid:
    "min-h-11 rounded-sm border border-border-card bg-brand-green px-3.5 py-2 text-sm font-black text-text-nav-strong hover:brightness-105 lg:h-[34px] lg:min-h-0 lg:text-[13px]",
  /* The landing redesign's spacious header (node 1360:8937) draws the same
   * outline/solid chrome as navOutline/navSolid but never shrinks it at
   * `lg` — kept as separate variants rather than a size prop on navOutline/
   * navSolid because the two headers answer to different Figma frames. */
  navOutlineLg:
    "min-h-11 rounded-sm border border-border-card bg-white px-3.5 py-2 text-sm font-black text-text-nav-strong hover:bg-surface-lilac/60",
  navSolidLg:
    "min-h-11 rounded-sm border border-border-card bg-brand-green px-3.5 py-2 text-sm font-black text-text-nav-strong hover:brightness-105",
  pricingOutline:
    "w-full rounded-sm bg-surface-lilac px-5 py-2 text-sm text-brand-blue hover:brightness-97",
  pricingSolid:
    "w-full rounded-sm bg-brand-green px-5 py-2 text-sm text-black hover:brightness-105",
  /* The register-child setup steps' arrow-only CTA (node 1269:19687). Disabled
   * fades only the bar's gradient stops, exactly as node 1269:18869 draws it —
   * the arrow and the bottom edge stay at full strength. Fading the background
   * instead of the whole button also keeps this clear of the CSS-animation
   * problem noted in GenderStep: an entrance animation's own opacity keyframe
   * would win over disabled:opacity-* for its whole fill-mode duration. */
  setupNext:
    "group h-[66px] w-full rounded-xl border-b-[3px] border-brand-green-edge bg-linear-to-r from-task-accent to-brand-blue px-[30px] py-4 text-white hover:-translate-y-px active:translate-y-px active:duration-75 disabled:pointer-events-none disabled:from-task-accent/20 disabled:to-brand-blue/20",
  /* The diagnostic task cards' CTA (node 1255:16764 and siblings) — the same
   * green bar as `cta` but edged in brand blue and unshadowed, per the design. */
  taskNext:
    "group h-20 w-full rounded-xl border-b-[3px] border-brand-blue bg-brand-green px-[30px] py-4 text-base font-black text-white hover:-translate-y-px active:translate-y-px active:duration-75 disabled:pointer-events-none disabled:bg-brand-green/40",
};

/** Variants whose Figma node draws the trailing arrow glyph. */
const withArrow: ReadonlySet<ButtonVariant> = new Set<ButtonVariant>(["cta", "setupNext", "taskNext"]);

/** Renders an `<a>` when `href` is given, a `<button>` otherwise — the CTA
 *  variant is shared by the hero's link into the assessment and the pricing
 *  cards, so both need the same chrome. */
export default function Button({ variant, children, className, ...props }: ButtonProps) {
  const classes = cn(base, variants[variant], className);
  const arrow = withArrow.has(variant) ? (
    <ArrowIcon className="h-[29px] w-[53px] shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
  ) : null;

  if (props.href !== undefined) {
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
        {arrow}
      </a>
    );
  }

  return (
    <button type="button" {...(props as ButtonHTMLAttributes<HTMLButtonElement>)} className={classes}>
      {children}
      {arrow}
    </button>
  );
}
