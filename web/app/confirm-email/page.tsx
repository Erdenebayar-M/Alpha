import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import ConfirmEmailCard from "@/components/auth/ConfirmEmailCard";
import { confirmEmail } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: confirmEmail.title,
  // The URL carries a live confirmation token: keep it out of search results
  // and out of the Referer header sent to anything the page loads or links to.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// No Figma node: the auth card, as on the reset-password page.
export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { token, next } = await searchParams;
  return (
    <AuthPageShell title={confirmEmail.title} prompt={{ ...confirmEmail.signInPrompt, href: siteConfig.loginUrl }}>
      <ConfirmEmailCard token={typeof token === "string" && token ? token : undefined} next={typeof next === "string" ? next : undefined} />
    </AuthPageShell>
  );
}
