import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

interface AuthCardProps {
  /** Omitted when the children draw their own AuthHeading — a card whose
   *  heading changes with its state (forgot password, 7:7189). */
  heading?: string;
  /** The corner prompt ("Бүртгэлгүй юу? / Бүртгүүлэх"). */
  prompt: { label: string; linkLabel: string; href: string };
  /** Above the form: the Google button and divider, when Google is configured. */
  lead?: ReactNode;
  children: ReactNode;
}

/**
 * The white card every auth page sits in (frame 7:4257, "Setup card" 7:4400):
 * the ОРТО logo, a corner prompt linking to the sibling auth page, the
 * heading, then the page's own form. Later auth tickets reuse it.
 *
 * Nominally 452px wide with 38px gutters, leaving the design's 374px column
 * (the Google button / inputs, 7:6166). Height follows content — the frame's
 * 621px includes the Google button and divider, which render only when
 * Google sign-in is configured. With them, heading, button, divider and form
 * are 20px apart (frame 7:6344's 20px card gap); without, the form sits 24px
 * under the heading.
 */
export default function AuthCard({ heading, prompt, lead, children }: AuthCardProps) {
  return (
    <div
      className="w-full max-w-[452px] shrink-0 rounded-card border border-white/50 bg-white/94 px-6 py-[38px] sm:px-[38px]"
      style={{ boxShadow: "var(--shadow-setup-card)" }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* 7:6068 — the design's own lockup is 143px wide at every size. */}
        <Link href="/" aria-label="ОРто, нүүр хуудас">
          <Logo className="w-[143px]" />
        </Link>
        <p className="flex flex-col items-end gap-[3px] text-xs">
          <span className="text-auth-muted">{prompt.label}</span>
          <a href={prompt.href} className="font-bold text-auth-link focus-ring">
            {prompt.linkLabel}
          </a>
        </p>
      </div>
      {heading && <AuthHeading className="mt-[29px] leading-[1.06]">{heading}</AuthHeading>}
      {lead && <div className="mt-5">{lead}</div>}
      <div className={lead ? "mt-5" : "mt-6"}>{children}</div>
    </div>
  );
}

/** The auth cards' 24px bold page heading. Line height is per frame. */
export function AuthHeading({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-2xl font-bold text-auth-ink", className)} {...props} />;
}
