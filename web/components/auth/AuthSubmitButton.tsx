const TONE = {
  // Sign in: 154 x 54, frame 7:4257 node 7:6148.
  dark: "w-[154px] rounded-xl bg-auth-action",
  // Sign up: 174 x 54, frame 7:6344 node 7:6775.
  green: "w-[174px] rounded-xl bg-brand-green",
} as const;

/** The auth cards' submit pill — not any of Button's variants. */
export default function AuthSubmitButton({ label, submitting, tone = "dark" }: { label: string; submitting: boolean; tone?: keyof typeof TONE }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={`h-[54px] px-6 text-[15px] font-bold text-white transition-[transform,opacity] duration-150 ease-press hover:-translate-y-px active:translate-y-px disabled:opacity-60 focus-ring ${TONE[tone]}`}
    >
      {label}
    </button>
  );
}
