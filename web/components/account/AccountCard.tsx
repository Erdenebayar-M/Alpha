import type { ReactNode } from "react";
import Image from "next/image";
import AccountNav from "@/components/account/AccountNav";
import { displayName, initials, type CurrentParent } from "@/lib/account/identity";
import { sampleAccount } from "@/lib/account/sample";
import { account } from "@/lib/content";

/**
 * The Account page's card (Figma frame 23:11664, "Profile card" 23:12038):
 * who is signed in, the menu, and the current tab's content as `children`.
 * Name and email are the parent's own; the completion bar is sample data
 * (docs/adr/0008-account-page-as-visual-prototype.md).
 */
export default function AccountCard({ parent, children }: { parent: CurrentParent; children: ReactNode }) {
  return (
    <div
      className="flex w-full max-w-[1120px] flex-col gap-6 rounded-card border border-white/50 bg-white/94 p-6 sm:p-[30px]"
      style={{ boxShadow: "var(--shadow-account-card)" }}
    >
      {/* Profile summary 23:12039 */}
      <div className="flex flex-wrap items-center gap-[18px]">
        <div className="relative flex size-[76px] shrink-0 items-center justify-center rounded-pill border border-account-avatar-border bg-surface-lilac text-2xl text-brand-blue">
          <span aria-hidden="true">{initials(parent)}</span>
          {/* Online 23:12042 */}
          <Image src="/images/account/online.svg" alt="" width={18} height={18} className="absolute left-[53px] top-[53px]" />
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-[5px]">
          <p className="break-words text-2xl text-account-ink">{displayName(parent)}</p>
          <p className="break-all text-[13px] font-bold text-text-nav">{parent.email}</p>
          <p className="text-xs font-bold text-auth-divider">{account.role}</p>
        </div>
        {/* Completion 23:12051 */}
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-[220px]">
          <div className="flex justify-between text-xs">
            <span className="font-black text-text-nav">{account.completionLabel}</span>
            <span className="text-brand-blue">{sampleAccount.completionPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-surface-lilac">
            <div className="h-full rounded-pill bg-brand-blue" style={{ width: `${sampleAccount.completionPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-border-card" />

      {/* Profile content 23:12058 */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-7">
        <AccountNav />
        <div className="hidden w-px shrink-0 self-stretch bg-border-card md:block" /> {/* 23:12084 */}
        <div className="flex min-w-0 flex-1 flex-col gap-[15px]">{children}</div> {/* Profile details 23:12085 */}
      </div>
    </div>
  );
}
