import Image from "next/image";
import FlashNotice from "@/components/auth/FlashNotice";
import { displayName, initials, type CurrentParent } from "@/lib/account/identity";
import { WELCOME_PARAM } from "@/lib/auth/flash";
import { account } from "@/lib/content";

const FIELD_LABEL = "text-xs font-black text-text-nav"; // 23:12098
const FIELD_VALUE = "flex h-[46px] items-center rounded-[10px] border border-border-card bg-account-field px-[13px] text-[13px] font-extrabold text-account-ink"; // 23:12099

/**
 * The Account page's card (Figma frame 23:11664, "Profile card" 23:12038):
 * who is signed in, and Sign out. The frame's menu, phone, birth date, profile
 * completion, 2FA and edit controls are not drawn — a Parent account holds
 * none of that yet (web/CONTEXT.md, Account page). `welcome` shows the
 * one-time notice after Sign in / Sign up.
 */
export default function AccountCard({ parent, welcome }: { parent: CurrentParent; welcome: boolean }) {
  const fields = [
    // Google-created accounts may have no Овог: the field is left off rather than shown empty.
    ...(parent.surname ? [{ label: account.surnameLabel, value: parent.surname }] : []),
    { label: account.nameLabel, value: parent.name },
  ];

  return (
    <div
      className="flex w-full max-w-[1120px] flex-col gap-6 rounded-card border border-white/50 bg-white/94 p-6 sm:p-[30px]"
      style={{ boxShadow: "var(--shadow-account-card)" }}
    >
      {welcome && <FlashNotice param={WELCOME_PARAM}>{account.welcome(parent.name)}</FlashNotice>}

      {/* Profile summary 23:12039 */}
      <div className="flex items-center gap-[18px]">
        <div className="relative flex size-[76px] shrink-0 items-center justify-center rounded-pill border border-account-avatar-border bg-surface-lilac text-2xl text-brand-blue">
          <span aria-hidden="true">{initials(parent)}</span>
          {/* Online 23:12042 */}
          <Image src="/images/account/online.svg" alt="" width={18} height={18} className="absolute left-[53px] top-[53px]" />
        </div>
        <div className="flex min-w-0 flex-col gap-[5px]">
          <p className="break-words text-2xl text-account-ink">{displayName(parent)}</p>
          <p className="break-all text-[13px] font-bold text-text-nav">{parent.email}</p>
          <p className="text-xs font-bold text-auth-divider">{account.role}</p>
        </div>
      </div>

      <div className="h-px w-full bg-border-card" />

      {/* Profile content 23:12058 */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-7">
        {/* Navigation 23:12059 — Sign out is the only entry until the other pages exist. */}
        <div className="flex w-full shrink-0 flex-col justify-end gap-2 md:w-[232px]">
          <div className="h-px w-full bg-border-card" />
          <form method="post" action="/api/auth/signout">
            <button
              type="submit"
              className="focus-ring flex h-[46px] w-full items-center gap-[11px] rounded-[10px] bg-account-danger-tint px-[14px] text-[13px] text-account-danger" // 23:12080
            >
              <Image src="/images/account/log-out.svg" alt="" width={18} height={18} />
              {account.signOutLabel}
            </button>
          </form>
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-border-card md:block" /> {/* 23:12084 */}

        {/* Profile details 23:12085 */}
        <div className="flex min-w-0 flex-1 flex-col gap-[15px]">
          <h1 className="text-2xl text-account-ink">{account.title}</h1>
          {/* Personal information 23:12094 */}
          <dl className="grid grid-cols-1 gap-3 rounded-md border border-border-card bg-account-field p-[17px] sm:grid-cols-2">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex min-w-0 flex-col gap-[7px]">
                <dt className={FIELD_LABEL}>{label}</dt>
                <dd className={FIELD_VALUE}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
