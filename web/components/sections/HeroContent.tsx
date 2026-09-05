import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import MetaChip from "@/components/ui/MetaChip";
import { hero } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export default function HeroContent() {
  return (
    <div className="flex flex-col items-center gap-11 text-center lg:items-start lg:text-left">
      <div className="flex flex-col items-center gap-5 lg:items-start lg:gap-[19px] lg:rounded-2xl lg:py-[18px] lg:pr-[35px] lg:pl-5">
        <Badge className="animate-rise-in [animation-delay:0ms]">{hero.badge}</Badge>
        <h1 className="animate-rise-in max-w-xl text-[clamp(28px,6.2vw,48px)] leading-[1.16] font-semibold tracking-[-0.01em] text-brand-blue [animation-delay:80ms] lg:max-w-[740px] lg:text-[clamp(34px,3.333vw,48px)]">
          {hero.title}
        </h1>
        <p className="animate-rise-in max-w-lg text-[clamp(16px,3.6vw,22px)] leading-[1.5] font-semibold tracking-[0.01em] text-brand-blue [animation-delay:160ms] lg:max-w-[453px] lg:text-[clamp(18px,1.528vw,22px)] lg:leading-[1.49]">
          {hero.lead}
        </p>
      </div>

      <div className="animate-rise-in flex flex-wrap items-center justify-center gap-[14px] [animation-delay:240ms] lg:justify-start lg:pl-5">
        {hero.metaChips.map((chip) => (
          <MetaChip key={chip.label} label={chip.label} />
        ))}
      </div>

      <div className="animate-rise-in w-full max-w-sm [animation-delay:320ms] lg:max-w-none lg:pl-5">
        <Button variant="cta" href={siteConfig.appUrl}>
          {hero.cta}
        </Button>
      </div>
    </div>
  );
}
