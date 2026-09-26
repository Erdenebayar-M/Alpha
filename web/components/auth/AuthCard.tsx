import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";

interface AuthCardProps {
  heading: string;
  /** The corner prompt ("Бүртгэлгүй юу? / Бүртгүүлэх"). */
  prompt: { label: string; linkLabel: string; href: string };
  children: ReactNode;
}

/**
 * The white card every auth page sits in (frame 7:4257, "Setup card" 7:4400):
 * the ОРТО logo, a corner prompt linking to the sibling auth page, the
 * heading, then the page's own form. Later auth tickets reuse it.
 *
 * Nominally 452px wide with 38px gutters, leaving the design's 374px column
 * (the Google button / inputs, 7:6166). Height follows content — the frame's
 * 621px includes the Google button and divider, which aren't shown yet.
 */
export default function AuthCard({ heading, prompt, children }: AuthCardProps) {
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
      <h1 className="mt-[29px] text-2xl leading-[1.06] font-bold text-auth-ink">{heading}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
