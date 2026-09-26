import Image from "next/image";
import AuthFormError from "@/components/auth/AuthFormError";
import { googleAuth } from "@/lib/content";

/*
 * The two frames draw the same button and divider with small differences, so
 * one component with a per-frame variant (like AuthSubmitButton's TONE):
 * - sign in (7:4257): fixed 153px hand-drawn rules (7:6121, 7:6123) and a
 *   12px "G" (7:6169);
 * - sign up (7:6344): rules that fill the row (7:6755, 7:6757) and a 13px
 *   "G" (7:6753).
 * The hand-drawn rule is the frame's exported SVG (its line is displaced by
 * an SVG turbulence filter); the straight one (a 1px #98A2B3 line at 72%) is
 * plain CSS.
 */
const handDrawnRule = (
  // A 153px slot, as drawn, narrowing on small screens: the artwork is
  // clipped, not squashed, and positioned absolutely so it adds nothing to
  // the card's intrinsic width. The exported line bleeds 3.1px each side and
  // is rotated 0.3deg.
  <span aria-hidden className="pointer-events-none relative h-[7.2px] max-w-[153px] flex-1 overflow-hidden">
    <Image
      src="/images/auth/divider-line.svg"
      alt=""
      width={159}
      height={7}
      className="absolute top-0 left-1/2 h-[7.2px] w-[159.2px] max-w-none -translate-x-1/2 rotate-[0.3deg]"
    />
  </span>
);
const fullRule = <span aria-hidden className="h-px min-w-px flex-1 bg-auth-divider opacity-72" />;

const VARIANT = {
  signIn: { rule: handDrawnRule, letter: "text-xs" },
  signUp: { rule: fullRule, letter: "text-[13px]" },
} as const;

/**
 * Google sign-in above an auth form: the blue button (Button 7:6166 / Google
 * action 7:6750, 374 x 56 filling the card's column), the failure message
 * when a previous attempt came back with an error (no frame), and the "Эсвэл"
 * divider (7:6120 / 7:6754), 20px apart as in the frames. Render only when
 * Google is configured. The button is a plain link to the start route, which
 * redirects to Google.
 */
export default function GoogleSignIn({
  variant,
  label,
  href,
  failed,
}: {
  variant: keyof typeof VARIANT;
  label: string;
  href: string;
  failed: boolean;
}) {
  const { rule, letter } = VARIANT[variant];

  return (
    <div className="flex flex-col gap-5">
      <a
        href={href}
        className="flex h-14 items-center justify-center gap-2.5 rounded-xl border-b-3 border-brand-green bg-brand-blue px-3 text-center text-[15px] font-semibold text-white transition-[transform,opacity] duration-150 ease-press hover:-translate-y-px active:translate-y-px focus-ring sm:px-[30px]"
      >
        {label}
        <span aria-hidden className={`flex h-7 w-[30px] items-center justify-center rounded-pill bg-white font-bold text-auth-link ${letter}`}>
          {googleAuth.iconLetter}
        </span>
      </a>
      {failed && <AuthFormError>{googleAuth.failed}</AuthFormError>}
      <div className="flex items-center justify-center gap-4">
        {rule}
        <span className="shrink-0 text-xs text-auth-divider">{googleAuth.dividerLabel}</span>
        {rule}
      </div>
    </div>
  );
}
