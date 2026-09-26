import type { Metadata } from "next";
import AuthPageShell from "@/components/auth/AuthPageShell";
import GoogleSignIn from "@/components/auth/GoogleSignIn";
import SignInForm from "@/components/auth/SignInForm";
import { googleStartHref } from "@/lib/auth/googleOAuth";
import { withNext } from "@/lib/auth/safeNext";
import { signIn } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: signIn.title,
  alternates: { canonical: "/signin" },
};

type SearchParams = Promise<{ next?: string | string[]; google_error?: string | string[] }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const googleHref = googleStartHref("/signin", next);

  return (
    <AuthPageShell
      title={signIn.title}
      prompt={{ ...signIn.registerPrompt, href: withNext(siteConfig.registerUrl, next) }}
      lead={googleHref && <GoogleSignIn variant="signIn" label={signIn.googleLabel} href={googleHref} failed={params.google_error !== undefined} />}
    >
      <SignInForm next={next} />
    </AuthPageShell>
  );
}
