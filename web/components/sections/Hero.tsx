import HeroContent from "@/components/sections/HeroContent";
import HeroScene from "@/components/sections/HeroScene";
import Mascot from "@/components/brand/Mascot";

export default function Hero() {
  return (
    <section
      id="top"
      aria-label="ОРто хөгжлийн үнэлгээ"
      className="relative isolate"
    >
      <HeroScene />

      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-5 pb-24 pt-14 md:px-10 lg:flex-row lg:items-start lg:gap-[59px] lg:pt-19 lg:pb-24 lg:pl-[100px] lg:pr-20">
        <div className="order-first w-48 shrink-0 lg:order-last lg:w-[clamp(280px,28vw,406px)]">
          <Mascot className="w-full" />
        </div>
        <div className="min-w-0 lg:w-[795px] lg:max-w-[795px] lg:flex-1">
          <HeroContent />
        </div>
      </div>
    </section>
  );
}
