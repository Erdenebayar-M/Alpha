import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import GoogleSignIn from "@/components/auth/GoogleSignIn";
import SignUpForm from "@/components/auth/SignUpForm";
import { googleStartHref } from "@/lib/auth/googleOAuth";
import { signUp } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: signUp.title,
  alternates: { canonical: "/signup" },
};

type SearchParams = Promise<{ next?: string | string[]; google_error?: string | string[] }>;

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const googleHref = googleStartHref("/signup", typeof params.next === "string" ? params.next : undefined);

  return (
    <AuthPageShell
      title={signUp.title}
      prompt={{ ...signUp.signInPrompt, href: siteConfig.loginUrl }}
      lead={googleHref && <GoogleSignIn variant="signUp" label={signUp.googleLabel} href={googleHref} failed={params.google_error !== undefined} />}
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
