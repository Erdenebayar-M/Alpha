import Button from "@/components/ui/Button";
import type { PricingPlanContent } from "@/lib/content";
import { cn } from "@/lib/cn";

interface PricingCardProps {
  plan: PricingPlanContent;
  ctaLabel: string;
  href: string;
}

export default function PricingCard({ plan, ctaLabel, href }: PricingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-4 rounded-lg bg-white p-5 shadow-card lg:h-[244px]",
        plan.featured ? "border-2 border-brand-indigo" : "border border-border-card"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-brand-blue">{plan.name}</span>
        {plan.badge ? (
          <span className="text-[10px] font-bold text-brand-blue">{plan.badge}</span>
        ) : null}
      </div>
      <p className="text-2xl font-black text-brand-blue">{plan.price}</p>
      <ul className="flex flex-col gap-2.5 text-xs font-bold text-brand-blue">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" aria-hidden="true">
              <path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Button variant={plan.featured ? "pricingSolid" : "pricingOutline"} href={href}>
        {ctaLabel} →
      </Button>
    </div>
  );
}
