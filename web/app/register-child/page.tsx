import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import RegisterScene from "@/components/sections/RegisterScene";
import RegisterChildFlow from "@/components/register/RegisterChildFlow";

export const metadata: Metadata = {
  title: "Хүүхдээ бүртгүүлэх",
  alternates: { canonical: "/register-child" },
};

export default function RegisterChildPage() {
  return (
    <>
      <Header basePath="/" />
      <main id="main">
        {/* Fixed to the remaining viewport height (100dvh minus the header's
            h-20) rather than a normal scrolling section — this is a
            step-by-step flow, not marketing content, so each step should
            read as one fixed screen with no page scroll. RegisterScene fills
            this box dynamically (bottom-anchored) instead of a fixed pixel
            height so the artwork never overshoots it downward — which is
            also why this section must NOT get `overflow-hidden`: the
            background bleeds *upward* (`-top-20`, same trick as HeroScene)
            to show through behind the transparent header, and clipping the
            section would clip that bleed too, leaving the header looking
            solid instead of transparent. The exact height alone (no
            overflow needed) is what keeps the page from scrolling. */}
        <section
          aria-label="Хүүхдийн мэдээлэл, үнэлгээ"
          className="relative isolate flex h-[calc(100dvh-5rem)] flex-col items-center justify-center px-5 py-4 md:px-10"
        >
          <RegisterScene />
          <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center">
            <RegisterChildFlow />
          </div>
        </section>
      </main>
    </>
  );
}
