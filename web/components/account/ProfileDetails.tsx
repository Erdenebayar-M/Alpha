"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Image from "next/image";
import { sampleAccount } from "@/lib/account/sample";
import { account } from "@/lib/content";

const CARD_TITLE = "text-lg text-account-ink"; // 23:12095, 23:12137
const FIELD_LABEL = "text-xs font-black text-text-nav"; // 23:12098
const FIELD_VALUE =
  "focus-ring-within flex h-[46px] items-center gap-[9px] rounded-[10px] border border-border-card bg-account-field px-[13px]"; // 23:12099
const FIELD_INPUT = "min-w-0 flex-1 bg-transparent text-[13px] font-extrabold text-account-ink outline-none"; // 23:12100
const TOAST_MS = 2500;

type FieldKey = "surname" | "name" | "phone" | "birthDate";

// Figma places these in two rows of two (23:12096, 23:12105); the grid wraps them.
const FIELDS: readonly { key: FieldKey; label: string; icon?: string }[] = [
  { key: "surname", label: account.surnameLabel },
  { key: "name", label: account.nameLabel },
  { key: "phone", label: account.phoneLabel, icon: "phone" }, // 23:12109
  { key: "birthDate", label: account.birthDateLabel, icon: "calendar-days" }, // 23:12115
];

function ProfileField({ label, icon, value, editing, onChange }: { label: string; icon?: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <label htmlFor={id} className={FIELD_LABEL}>{label}</label>
      <div className={FIELD_VALUE}>
        {icon && <Image src={`/images/account/${icon}.svg`} alt="" width={16} height={16} />}
        <input id={id} value={value} readOnly={!editing} onChange={(e) => onChange(e.target.value)} className={FIELD_INPUT} />
      </div>
    </div>
  );
}

/** One line of the security card (Figma "Security setting" 23:12138, 23:12148): a tile icon, what it is, and a control. */
function SettingRow({ icon, title, hint, children }: { icon: string; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-[11px]">
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-surface-lilac">
        <Image src={`/images/account/${icon}.svg`} alt="" width={18} height={18} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[13px] text-account-ink">{title}</p>
        <p className="text-xs font-bold text-text-nav">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * The Нууцлал ба аюулгүй байдал tab (Figma "Profile details" 23:12085). A
 * visual prototype: Edit, Save, the toggle and Өөрчлөх respond, but nothing is
 * sent or kept (docs/adr/0008-account-page-as-visual-prototype.md).
 */
export default function ProfileDetails({ surname, name }: { surname: string; name: string }) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    surname,
    name,
    phone: sampleAccount.phone,
    birthDate: sampleAccount.birthDate,
  });
  const [editing, setEditing] = useState(false);
  const [twoFactor, setTwoFactor] = useState<boolean>(sampleAccount.twoFactorOn);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const save = () => {
    setEditing(false);
    setToast(account.saved);
  };

  return (
    <>
      {/* Page heading 23:12086 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h1 className="text-2xl text-account-ink">{account.title}</h1>
          <p className="text-[13px] font-bold text-text-nav">{account.description}</p>
        </div>
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing((on) => !on)}
          className="focus-ring flex items-center gap-[7px] rounded-[10px] bg-surface-lilac px-[14px] py-[9px] text-[13px] text-brand-blue" // 23:12090
        >
          <Image src="/images/account/pencil.svg" alt="" width={15} height={15} />
          {account.editLabel}
        </button>
      </div>

      {/* Personal information 23:12094 */}
      <section className="flex flex-col gap-[13px] rounded-md border border-border-card bg-account-field p-[17px]">
        <h2 className={CARD_TITLE}>{account.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map(({ key, label, icon }) => (
            <ProfileField key={key} label={label} icon={icon} value={values[key]} editing={editing} onChange={(value) => setValues((v) => ({ ...v, [key]: value }))} />
          ))}
        </div>
      </section>

      {/* Privacy and security 23:12136 */}
      <section className="flex flex-col rounded-md border border-border-card bg-white px-[17px] py-[13px]">
        <h2 className={CARD_TITLE}>{account.security.title}</h2>
        <SettingRow icon="key-round" title={account.security.passwordTitle} hint={account.security.passwordHint}>
          <button
            type="button"
            onClick={() => setToast(account.passwordSoon)}
            className="focus-ring shrink-0 rounded-[10px] border border-border-card px-3 py-[7px] text-xs font-black text-brand-blue" // 23:12145
          >
            {account.security.passwordAction}
          </button>
        </SettingRow>
        <div className="h-px w-full bg-border-card" /> {/* 23:12147 */}
        <SettingRow icon="shield-check-tile" title={account.security.twoFactorTitle} hint={account.security.twoFactorHint}>
          {/* Toggle 23:12155 — drawn in CSS, since the exported SVG is a fixed "on" state. */}
          <button
            type="button"
            role="switch"
            aria-checked={twoFactor}
            aria-label={account.security.twoFactorTitle}
            onClick={() => setTwoFactor((on) => !on)}
            className={`focus-ring relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-150 ${twoFactor ? "bg-brand-blue" : "bg-border-card"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute left-[3px] top-[3px] size-[18px] rounded-pill bg-white shadow-tile-loose transition-transform duration-150 ${twoFactor ? "translate-x-5" : ""}`}
            />
          </button>
        </SettingRow>
      </section>

      {/* Save actions 23:12157 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-auth-divider">{account.saveHint}</p>
        <button type="button" onClick={save} className="focus-ring flex items-center gap-2 rounded-[10px] bg-brand-blue px-[18px] py-[11px] text-[13px] text-white">
          <Image src="/images/account/check.svg" alt="" width={16} height={16} />
          {account.saveLabel}
        </button>
      </div>

      {toast && (
        <p role="status" className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-[10px] bg-account-ink px-4 py-3 text-[13px] font-bold text-white shadow-card">
          {toast}
        </p>
      )}
    </>
  );
}
