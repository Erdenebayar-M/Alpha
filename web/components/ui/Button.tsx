import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import ArrowIcon from "@/components/ui/ArrowIcon";

type ButtonVariant = "cta" | "navOutline" | "navSolid" | "pricingOutline" | "pricingSolid";

interface BaseProps {
  variant: ButtonVariant;
  children: ReactNode;
  className?: string;
}

type ButtonProps =
  | (BaseProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">)
  | (BaseProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">);

const base =
  "inline-flex items-center justify-center gap-2.5 font-extrabold transition-[transform,box-shadow,background-color] duration-150 ease-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2";

const variants: Record<ButtonVariant, string> = {
  cta: "group w-full h-20 rounded-xl bg-brand-green border-b-[3px] border-brand-green-edge px-[30px] py-4 text-base font-black text-white shadow-card hover:-translate-y-px active:translate-y-px active:duration-75",
  navOutline:
    "min-h-11 rounded-sm border border-border-card bg-white px-3.5 py-2 text-[13px] font-black text-text-nav-strong hover:bg-surface-lilac/60 lg:h-[34px] lg:min-h-0",
  navSolid:
    "min-h-11 rounded-sm border border-border-card bg-brand-green px-3.5 py-2 text-[13px] font-black text-text-nav-strong hover:brightness-105 lg:h-[34px] lg:min-h-0",
  pricingOutline:
    "w-full rounded-sm bg-surface-lilac px-5 py-2 text-sm text-brand-blue hover:brightness-97",
  pricingSolid:
    "w-full rounded-sm bg-brand-green px-5 py-2 text-sm text-black hover:brightness-105",
};

/** Renders an `<a>` when `href` is given, a `<button>` otherwise — the CTA
 *  variant is shared by the hero's link into the assessment and the
 *  register-child flow's form-submit buttons, so both need the same chrome. */
export default function Button({ variant, children, className, ...props }: ButtonProps) {
  const classes = cn(base, variants[variant], className);
  const arrow = variant === "cta" ? (
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
