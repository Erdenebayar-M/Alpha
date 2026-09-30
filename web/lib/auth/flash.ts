import { siteConfig } from "@/lib/site-config";

/**
 * One-time notices carried as a query flag: the flow that ends on a page adds
 * it, the page shows the notice once and strips the flag (FlashNotice). A
 * reload or a shared link that keeps the flag only repeats a harmless message.
 */
export const WELCOME_PARAM = "welcome";
export const SIGNED_OUT_PARAM = "signedout";

/** Where a parent lands after Sign in or Sign up when no `next` says otherwise. */
export const welcomeUrl = `${siteConfig.accountUrl}?${WELCOME_PARAM}=1`;

/** Where Sign out leaves the parent. */
export const signedOutUrl = `${siteConfig.loginUrl}?${SIGNED_OUT_PARAM}=1`;
