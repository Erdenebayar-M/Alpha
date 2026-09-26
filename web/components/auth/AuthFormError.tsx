import type { ReactNode } from "react";

/** The auth forms' whole-form message (a backend error), just under the fields. */
export default function AuthFormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="-mt-2 text-xs text-[color:var(--color-palette-red)]">
      {children}
    </p>
  );
}
