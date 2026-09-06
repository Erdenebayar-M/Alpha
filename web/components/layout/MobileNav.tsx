"use client";

import { useEffect, useRef, useState } from "react";
import { nav } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";
import Button from "@/components/ui/Button";

interface MobileNavProps {
  /** See Header.tsx's basePath — prefixes each link's hash for use off "/" . */
  basePath?: string;
}

/** The only stateful component in the header: a disclosure panel for narrow
 *  viewports. Traps no focus (a full modal is overkill for 5 links) but does
 *  return focus to the trigger and closes on Escape or link selection. */
export default function MobileNav({ basePath = "" }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-md border border-border-card bg-white focus-ring"
      >
        <span className="sr-only">Цэс {open ? "хаах" : "нээх"}</span>
        <svg viewBox="0 0 24 24" className="size-5 text-text-nav-strong" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full z-20 border-b border-border-card bg-white px-5 py-4 shadow-card"
        >
          <ul className="flex flex-col gap-3">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={`${basePath}${link.href}`}
                  onClick={() => setOpen(false)}
                  className="block min-h-11 py-2 text-sm font-extrabold text-text-nav"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2 border-t border-border-card pt-3">
            <Button variant="navOutline" href={siteConfig.loginUrl} className="flex-1 text-center">
              {nav.auth.loginLabel}
            </Button>
            <Button variant="navSolid" href={siteConfig.registerUrl} className="flex-1 text-center">
              {nav.auth.registerLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
