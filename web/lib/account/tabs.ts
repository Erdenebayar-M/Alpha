import { account } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export type AccountTabId = keyof typeof account.tabs;

export interface AccountTab {
  id: AccountTabId;
  label: string;
  href: string;
  /** Icon files in /images/account — the Figma icons carry their colour, so
   *  each tab has one in the menu's grey and one in brand blue. */
  icon: string;
  iconActive: string;
}

const tab = (id: AccountTabId, icon: string, href = `${siteConfig.accountUrl}/${id}`): AccountTab => ({
  id,
  label: account.tabs[id],
  href,
  icon: `/images/account/${icon}.svg`,
  iconActive: `/images/account/${icon}-active.svg`,
});

/** The four Account tabs, in the frame's order (23:12066, 23:12061, 23:12070, 23:12074). The
 *  Нууцлал tab is the one with content, so it owns the bare /account address that Sign in and Sign up land on. */
export const accountTabs: readonly AccountTab[] = [
  tab("dashboard", "badge-info"),
  tab("children", "user-round"),
  tab("security", "shield-check", siteConfig.accountUrl),
  tab("notifications", "bell"),
];
