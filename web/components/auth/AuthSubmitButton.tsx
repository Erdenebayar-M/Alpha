const TONE = {
  dark: "bg-auth-action text-white",
  green: "bg-brand-green text-auth-ink",
} as const;

/** The auth cards' submit pill (node 7:6148 — 154 x 54, not any of Button's variants). */
export default function AuthSubmitButton({ label, submitting, tone = "dark" }: { label: string; submitting: boolean; tone?: keyof typeof TONE }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={`h-[54px] w-[154px] rounded-xl px-6 text-[15px] font-bold transition-[transform,opacity] duration-150 ease-press hover:-translate-y-px active:translate-y-px disabled:opacity-60 focus-ring ${TONE[tone]}`}
    >
      {label}
    </button>
  );
}
