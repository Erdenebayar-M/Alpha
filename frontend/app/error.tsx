"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Алдаа гарлаа</h2>
      <p className="text-sm opacity-70">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-md bg-foreground text-background"
      >
        Дахин оролдох
      </button>
    </div>
  );
}
