import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComingSoon from "@/components/account/ComingSoon";
import { accountTabs } from "@/lib/account/tabs";

// The tabs with no content yet. The Нууцлал tab has its own page at /account,
// so /account/security is not one of these.
const comingSoonTabs = accountTabs.filter(({ id }) => id !== "security");

export const dynamicParams = false;

export const generateStaticParams = () => comingSoonTabs.map(({ id }) => ({ tab: id }));

const findTab = async (params: Promise<{ tab: string }>) => {
  const { tab } = await params;
  return comingSoonTabs.find(({ id }) => id === tab) ?? notFound();
};

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  return { title: (await findTab(params)).label };
}

export default async function AccountComingSoonPage({ params }: { params: Promise<{ tab: string }> }) {
  return <ComingSoon tab={(await findTab(params)).label} />;
}
