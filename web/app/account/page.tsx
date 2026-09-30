import ProfileDetails from "@/components/account/ProfileDetails";
import FlashNotice from "@/components/auth/FlashNotice";
import { currentParent } from "@/lib/api/server/currentParent";
import { WELCOME_PARAM } from "@/lib/auth/flash";
import { account } from "@/lib/content";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The Нууцлал ба аюулгүй байдал tab — the one with content, and where Sign in
// and Sign up land. The layout has already sent a parent with no session away.
export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const parent = (await currentParent())!;
  const params = await searchParams;

  return (
    <>
      {params[WELCOME_PARAM] !== undefined && <FlashNotice param={WELCOME_PARAM}>{account.welcome(parent.name)}</FlashNotice>}
      <ProfileDetails surname={parent.surname ?? ""} name={parent.name} />
    </>
  );
}
