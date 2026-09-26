import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import SignInForm from "@/components/auth/SignInForm";
import { signIn } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: signIn.title,
  alternates: { canonical: "/signin" },
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;

  return (
    <AuthPageShell title={signIn.title} prompt={{ ...signIn.registerPrompt, href: siteConfig.registerUrl }}>
      <SignInForm next={typeof next === "string" ? next : undefined} />
    </AuthPageShell>
  );
}
