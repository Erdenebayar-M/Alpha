import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import GoogleSignIn from "@/components/auth/GoogleSignIn";
import SignUpForm from "@/components/auth/SignUpForm";
import { googleStartHref } from "@/lib/auth/googleOAuth";
import { withNext } from "@/lib/auth/safeNext";
import { signUp } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: signUp.title,
  alternates: { canonical: "/signup" },
};

type SearchParams = Promise<{ next?: string | string[]; google_error?: string | string[] }>;

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const googleHref = googleStartHref("/signup", next);

  return (
    <AuthPageShell
      title={signUp.title}
      prompt={{ ...signUp.signInPrompt, href: withNext(siteConfig.loginUrl, next) }}
      lead={googleHref && <GoogleSignIn variant="signUp" label={signUp.googleLabel} href={googleHref} failed={params.google_error !== undefined} />}
    >
      <SignUpForm next={next} />
    </AuthPageShell>
  );
}
