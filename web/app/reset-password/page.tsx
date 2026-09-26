import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";
import { resetPassword } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: resetPassword.title,
  // The URL carries a live reset token: keep it out of search results and
  // out of the Referer header sent to anything the page loads or links to.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// No Figma node: derived from frame 7:7189. The card draws its own heading,
// since its message changes with the outcome.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { token } = await searchParams;
  return (
    <AuthPageShell title={resetPassword.title} heading={null} prompt={{ ...resetPassword.signInPrompt, href: siteConfig.loginUrl }}>
      <ResetPasswordCard token={typeof token === "string" && token ? token : undefined} />
    </AuthPageShell>
  );
}
