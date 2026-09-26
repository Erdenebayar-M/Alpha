import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import RegisterScene from "@/components/sections/RegisterScene";
import AuthCard from "@/components/auth/AuthCard";
import SignInArt from "@/components/auth/SignInArt";
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
    <>
      <Header basePath="/" />
      <main id="main">
        {/* Frame 7:4257: the register-child sky and hills behind a centred
            card, with the cloud and mascot to its right (63px apart at the
            design width: card ends x=740, cloud starts x=803). Unlike
            register-child this is a one-screen form, not a fixed-height flow,
            so the section only has a minimum height and may scroll on short
            viewports. No overflow-hidden, for the same reason as there: the
            scene bleeds up behind the transparent header. */}
        <section
          aria-label={signIn.title}
          className="relative isolate flex min-h-[calc(100dvh-5rem)] items-center justify-center px-5 py-8 md:px-10"
        >
          <RegisterScene />
          <div className="relative flex items-center justify-center gap-[63px]">
            <AuthCard heading={signIn.title} prompt={{ ...signIn.registerPrompt, href: siteConfig.registerUrl }}>
              <SignInForm next={typeof next === "string" ? next : undefined} />
            </AuthCard>
            <SignInArt />
          </div>
        </section>
      </main>
    </>
  );
}
