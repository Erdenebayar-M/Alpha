"use client";

import { useEffect } from "react";

/**
 * A one-time notice (lib/auth/flash.ts): shown from the server-rendered page,
 * then its `param` is dropped from the address so a reload doesn't repeat it.
 */
export default function FlashNotice({ param, children }: { param: string; children: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(param)) return;
    url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
  }, [param]);

  return (
    <p role="status" className="rounded-slot bg-brand-green/25 px-4 py-3 text-sm font-bold text-auth-ink">
      {children}
    </p>
  );
}
