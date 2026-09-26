import { useId } from "react";

interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  type?: "text" | "password" | "email";
  name?: string;
  /** Inline message shown under the input; also marks the input invalid. */
  error?: string;
}

/**
 * The register-child name step's labelled input (node 1269:19623 — label
 * 1269:19624, box 1269:19625).
 *
 * Figma types the two labels in Inter while every other string on the card is
 * Nunito; the file loads no Inter and the rest of the design system is Nunito
 * throughout, so this is a Figma default leaking into two text nodes rather
 * than a real type choice. Rendered in the page font like everything else.
 */
export default function TextField({
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  type = "text",
  name,
  error,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex w-full flex-col gap-[7px]">
      <label className="text-xs font-extrabold text-setup-label" htmlFor={id}>
        {label}
      </label>
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
        className={`h-[clamp(52px,7dvh,66px)] w-full rounded-xl border ${error ? "border-[color:var(--color-palette-red)]" : "border-setup-border"} bg-white p-3.5 text-xs text-black placeholder:text-text-nav focus-ring`}
      />
      {error && (
        <p id={errorId} className="text-xs text-[color:var(--color-palette-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
