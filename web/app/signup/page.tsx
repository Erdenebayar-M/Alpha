import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { signUp } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: signUp.title,
  alternates: { canonical: "/signup" },
};

export default function SignUpPage() {
  return (
    <AuthPageShell title={signUp.title} prompt={{ ...signUp.signInPrompt, href: siteConfig.loginUrl }}>
      <SignUpForm />
    </AuthPageShell>
  );
}
