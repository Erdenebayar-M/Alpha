"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountTabs } from "@/lib/account/tabs";
import { account } from "@/lib/content";

// One recipe for every entry in the menu — the tabs and Sign out (23:12066, 23:12061, 23:12080).
const ITEM = "focus-ring relative flex h-[46px] shrink-0 items-center gap-[11px] rounded-[10px] px-[14px] text-[13px]";

/**
 * The Account page's menu (Figma "Profile navigation" 23:12059): the four
 * Account tabs, then Sign out, which is not a tab. Below `md` it is a
 * horizontally scrolling strip with Sign out last.
 */
export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={account.settingsLabel}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 md:mx-0 md:min-h-[650px] md:w-[232px] md:shrink-0 md:flex-col md:overflow-visible md:p-0"
    >
      <p className="hidden text-xs uppercase tracking-[0.8px] text-auth-divider md:block">{account.settingsLabel}</p> {/* 23:12060 */}

      {accountTabs.map(({ id, label, href, icon, iconActive }) => {
        const active = pathname === href;
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${ITEM} whitespace-nowrap ${active ? "bg-surface-lilac text-brand-blue" : "font-extrabold text-text-nav hover:bg-surface-lilac/60"}`}
          >
            <Image src={active ? iconActive : icon} alt="" width={18} height={18} />
            {label}
            {/* Active marker 23:12065 */}
            {active && <span aria-hidden="true" className="absolute left-0 top-3 h-[22px] w-[3px] rounded-pill bg-brand-blue" />}
          </Link>
        );
      })}

      <div className="hidden md:block md:flex-1" /> {/* Navigation spacer 23:12078 */}
      <div className="hidden h-px w-full bg-border-card md:block" /> {/* 23:12079 */}

      <form method="post" action="/api/auth/signout" className="shrink-0 md:w-full">
        <button type="submit" className={`${ITEM} w-full whitespace-nowrap bg-account-danger-tint text-account-danger`}>
          <Image src="/images/account/log-out.svg" alt="" width={18} height={18} />
          {account.signOutLabel}
        </button>
      </form>
    </nav>
  );
}
