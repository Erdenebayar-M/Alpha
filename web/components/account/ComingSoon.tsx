import Mascot from "@/components/brand/Mascot";
import { account } from "@/lib/content";

/** What an Account tab without content shows (web/CONTEXT.md, Coming soon screen): the mascot and a headline naming the tab. Not in the Figma frame. */
export default function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center gap-3 py-8 text-center md:min-h-[560px]">
      <Mascot decorative className="w-44" />
      <h1 className="text-2xl text-account-ink">{account.comingSoon.headline(tab)}</h1>
      <p className="max-w-[320px] text-[13px] font-bold text-text-nav">{account.comingSoon.subtitle}</p>
    </div>
  );
}
