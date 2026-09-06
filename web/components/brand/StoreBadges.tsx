import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site-config";
import { storeBadges } from "@/lib/content";

/**
 * The Figma "Апп татах icon холбоосууд" node is a single flattened 121x54 PNG
 * upscaled to 252x110 (visibly blurry at that size), so it's rebuilt here as
 * hand-authored, crisp badge vectors instead of shipping the same raster.
 * App Store and Google Play share this one shell, differing only in href,
 * icon and store name.
 */
function StoreBadge({ href, name, icon }: { href: string; name: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      className="flex h-11 w-36 items-center gap-2 rounded-lg border border-border-card bg-black px-3 text-white transition-transform hover:-translate-y-px focus-ring"
    >
      {icon}
      <span className="flex flex-col leading-none">
        <span className="text-[9px] text-white/80">{storeBadges.downloadLabel}</span>
        <span className="text-sm font-bold">{name}</span>
      </span>
    </a>
  );
}

const appStoreIcon = (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.536c-.02-2.036 1.665-3.012 1.74-3.06-.95-1.39-2.427-1.58-2.953-1.6-1.257-.13-2.454.74-3.09.74-.638 0-1.62-.72-2.665-.7-1.37.02-2.634.8-3.34 2.03-1.425 2.47-.364 6.12 1.024 8.126.68.98 1.49 2.08 2.55 2.04 1.026-.04 1.412-.66 2.65-.66 1.238 0 1.585.66 2.665.64 1.1-.02 1.795-.998 2.47-1.982.777-1.135 1.097-2.24 1.113-2.297-.024-.01-2.136-.82-2.156-3.277zM15.06 5.44c.567-.687.95-1.643.845-2.594-.816.033-1.803.545-2.39 1.23-.526.607-.985 1.582-.86 2.514.912.07 1.845-.463 2.405-1.15z" />
  </svg>
);

const googlePlayIcon = (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true">
    <path d="M3.6 2.6c-.4.25-.6.7-.6 1.2v16.4c0 .5.2.95.6 1.2l9.9-9.4-9.9-9.4z" fill="#00D2FF" />
    <path d="M17.1 12l-3.1-1.9-2.5 2.4 2.5 2.4 3.1-1.9c.6-.35.6-1.05 0-1.4z" fill="#FFCE00" />
    <path d="M13.5 12.5l-9.9 9.4c.3.15.6.2 1 .2.3 0 .6-.1.9-.25l10.7-6.2-2.7-3.15z" fill="#00F076" />
    <path d="M13.5 11.5l2.7-3.15-10.7-6.2c-.4-.2-.85-.25-1.3-.1l9.3 9.45z" fill="#FF3A44" />
  </svg>
);

/** A small placeholder QR pattern — not a scannable code, since the real
 *  download URL isn't wired in yet (see lib/site-config.ts). */
function QrPlaceholder() {
  const cells = [
    "1110111",
    "1000101",
    "1011101",
    "0000010",
    "1011100",
    "1000111",
    "1110100",
  ];
  return (
    <svg viewBox="0 0 70 70" className="size-16 shrink-0 rounded-md border border-border-card bg-white p-1.5" aria-hidden="true">
      {cells.flatMap((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="9" height="9" fill="#24428F" /> : null
        )
      )}
    </svg>
  );
}

export default function StoreBadges() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QrPlaceholder />
      <div className="flex flex-col gap-2">
        <StoreBadge href={siteConfig.appStoreUrl} name="App Store" icon={appStoreIcon} />
        <StoreBadge href={siteConfig.playStoreUrl} name="Google Play" icon={googlePlayIcon} />
      </div>
    </div>
  );
}
