import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountCard from "@/components/account/AccountCard";
import Header from "@/components/layout/Header";
import RegisterScene from "@/components/sections/RegisterScene";
import { currentParent } from "@/lib/api/server/currentParent";
import { WELCOME_PARAM } from "@/lib/auth/flash";
import { withNext } from "@/lib/auth/safeNext";
import { account } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: account.title,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The Account page (Figma frame 23:11664). proxy.ts already sends a parent with
// no session to sign in; this covers a token the backend rejects after that.
export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const parent = await currentParent();
  if (!parent) redirect(withNext(siteConfig.loginUrl, siteConfig.accountUrl));
  const params = await searchParams;

  return (
    <>
      <Header basePath="/" />
      <main id="main">
        <section
          aria-label={account.title}
          className="relative isolate flex min-h-[calc(100dvh-5rem)] items-center justify-center px-5 py-8 md:px-10"
        >
          <RegisterScene />
          <div className="relative flex w-full justify-center">
            <AccountCard parent={parent} welcome={params[WELCOME_PARAM] !== undefined} />
          </div>
        </section>
      </main>
    </>
  );
}
