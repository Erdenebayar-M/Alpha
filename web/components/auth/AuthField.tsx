import { useId, type ReactNode } from "react";

interface AuthFieldProps {
  label: string;
  /** Sits opposite the label (the password field's "forgot" link). */
  labelAction?: ReactNode;
  type: "email" | "password";
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  /** Inline message under the input; also marks it invalid. */
  error?: string;
}

/**
 * The auth cards' labelled input (frame 7:4257 — "Field" 7:6130 / 7:6262).
 *
 * Deliberately not `ui/TextField`: that one is the register-child setup
 * step's field (12px extrabold label, fluid-height 12px-radius box), and this
 * one answers to a different frame — 13px label with an optional action on
 * its right, 56px box, 24px radius, a blue focus ring. Alike in shape today,
 * different parts of the design; merging them would take a pile of variant
 * props.
 */
export default function AuthField({
  label,
  labelAction,
  type,
  name,
  placeholder,
  value,
  onChange,
  autoComplete,
  error,
}: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] text-auth-muted">
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-14 w-full rounded-xl border bg-white px-4 text-[15px] text-auth-ink outline-none transition-shadow placeholder:text-text-nav focus:border-[1.5px] focus:border-auth-link focus:shadow-[0_0_0_3px_rgba(61,120,242,0.12)] ${error ? "border-[color:var(--color-palette-red)]" : "border-auth-border"}`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[color:var(--color-palette-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
