import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import ForgotPasswordCard from "@/components/auth/ForgotPasswordCard";
import { forgotPassword } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: forgotPassword.title,
  alternates: { canonical: "/forgot-password" },
};

// Frame 7:7189. The card draws its own heading, which changes once a link is sent.
export default function ForgotPasswordPage() {
  return (
    <AuthPageShell title={forgotPassword.title} heading={null} prompt={{ ...forgotPassword.signInPrompt, href: siteConfig.loginUrl }}>
      <ForgotPasswordCard />
    </AuthPageShell>
  );
}
