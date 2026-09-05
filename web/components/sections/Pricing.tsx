import PricingCard from "@/components/ui/PricingCard";
import Reveal from "@/components/animations/Reveal";
import StoreBadges from "@/components/brand/StoreBadges";
import { pricing } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export default function Pricing() {
  return (
    <section
      id="une"
      aria-labelledby="pricing-heading"
      className="relative overflow-hidden bg-hill-band px-5 pt-10 pb-20 md:px-10 lg:pl-[123px] lg:pr-20"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-12 lg:flex-row lg:gap-[72px]">
        <div className="flex flex-1 flex-col items-start gap-4">
          <p className="text-sm font-bold text-brand-blue">{pricing.eyebrow}</p>
          <h2 id="pricing-heading" className="text-[clamp(22px,4vw,28px)] font-extrabold text-brand-blue">
            {pricing.heading}
          </h2>
          <p className="text-base leading-relaxed text-brand-blue md:text-lg">
            {pricing.description}
          </p>
          <StoreBadges />
        </div>

        <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-[560px]">
          {pricing.plans.map((plan, index) => (
            <Reveal
              key={plan.id}
              className="flex"
              style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <PricingCard
                plan={plan}
                ctaLabel={pricing.ctaLabel}
                href={siteConfig.registerUrl}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
