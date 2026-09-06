import type { CSSProperties } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import MetaChip from "@/components/ui/MetaChip";
import { hero } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

const STAGGER_MS = 80;

/** `index * STAGGER_MS` as a `--delay` custom property, read by the
 *  `[animation-delay:var(--delay)]` arbitrary value below — the same
 *  css-var-plus-inline-style split `[data-reveal]`'s `--reveal-delay`
 *  uses in globals.css, needed because Tailwind's arbitrary values must be
 *  static text at build time and can't embed a runtime-computed number. */
function delay(index: number): CSSProperties {
  return { "--delay": `${index * STAGGER_MS}ms` } as CSSProperties;
}

export default function HeroContent() {
  return (
    <div className="flex flex-col items-center gap-11 text-center lg:items-start lg:text-left">
      <div className="flex flex-col items-center gap-5 lg:items-start lg:gap-[19px] lg:rounded-2xl lg:py-[18px] lg:pr-[35px] lg:pl-5">
        <Badge className="animate-rise-in [animation-delay:0ms]">{hero.badge}</Badge>
        <h1
          className="animate-rise-in max-w-xl text-[clamp(28px,6.2vw,48px)] leading-[1.16] font-semibold tracking-[-0.01em] text-brand-blue [animation-delay:var(--delay)] lg:max-w-[740px] lg:text-[clamp(34px,3.333vw,48px)]"
          style={delay(1)}
        >
          {hero.title}
        </h1>
        <p
          className="animate-rise-in max-w-lg text-[clamp(16px,3.6vw,22px)] leading-[1.5] font-semibold tracking-[0.01em] text-brand-blue [animation-delay:var(--delay)] lg:max-w-[453px] lg:text-[clamp(18px,1.528vw,22px)] lg:leading-[1.49]"
          style={delay(2)}
        >
          {hero.lead}
        </p>
      </div>

      <div
        className="animate-rise-in flex flex-wrap items-center justify-center gap-[14px] [animation-delay:var(--delay)] lg:justify-start lg:pl-5"
        style={delay(3)}
      >
        {hero.metaChips.map((chip) => (
          <MetaChip key={chip.label} label={chip.label} />
        ))}
      </div>

      <div className="animate-rise-in w-full max-w-sm [animation-delay:var(--delay)] lg:max-w-none lg:pl-5" style={delay(4)}>
        <Button variant="cta" href={siteConfig.assessmentUrl}>
          {hero.cta}
        </Button>
      </div>
    </div>
  );
}
