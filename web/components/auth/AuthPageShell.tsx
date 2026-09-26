import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import RegisterScene from "@/components/sections/RegisterScene";
import AuthCard from "@/components/auth/AuthCard";
import SignInArt from "@/components/auth/SignInArt";

/**
 * The page every auth route shares: header, the register-child sky and hills
 * behind a centred card, the cloud and mascot to its right (63px apart at the
 * design width: card ends x=740, cloud starts x=803 in frame 7:4257; frame
 * 7:6344 uses the same scene with a taller card). Unlike register-child this
 * is a one-screen form, not a fixed-height flow, so the section only has a
 * minimum height and may scroll on short viewports. No overflow-hidden: the
 * scene bleeds up behind the transparent header.
 */
export default function AuthPageShell({
  title,
  prompt,
  children,
}: {
  title: string;
  prompt: { label: string; linkLabel: string; href: string };
  children: ReactNode;
}) {
  return (
    <>
      <Header basePath="/" />
      <main id="main">
        <section
          aria-label={title}
          className="relative isolate flex min-h-[calc(100dvh-5rem)] items-center justify-center px-5 py-8 md:px-10"
        >
          <RegisterScene />
          <div className="relative flex items-center justify-center gap-[63px]">
            <AuthCard heading={title} prompt={prompt}>
              {children}
            </AuthCard>
            <SignInArt />
          </div>
        </section>
      </main>
    </>
  );
}
