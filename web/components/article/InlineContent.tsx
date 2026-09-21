import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { colorCss, tintCss } from "./colors";
import type { InlineSpan } from "./types";

// Multi-line highlights need each visual line to keep its own rounded
// background rather than one box spanning the gap between lines.
const highlightStyle: CSSProperties = { boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };

function spanKey(index: number, span: InlineSpan): string {
  return `${index}-${span.text}`;
}

/**
 * One InlineSpan. A link always renders in the site's link colour — `href`
 * never coexists with `color`/`highlight` (enforced by the Zod schema, ADR
 * 0003), so this only has to pick one visual treatment per span, not merge
 * them. Bold/italic layer on top of whichever one applies.
 */
function Span({ span }: { span: InlineSpan }) {
  const weight = cn(span.bold && "font-bold", span.italic && "italic");

  if (span.href) {
    return (
      <a href={span.href} className={cn(weight, "text-brand-blue underline underline-offset-2")}>
        {span.text}
      </a>
    );
  }

  if (span.highlight) {
    return (
      <mark
        className={cn(weight, "rounded-[3px] px-0.5 text-current")}
        style={{ ...highlightStyle, backgroundColor: tintCss(span.highlight) }}
      >
        {span.text}
      </mark>
    );
  }

  if (span.color) {
    return (
      <span className={weight || undefined} style={{ color: colorCss(span.color) }}>
        {span.text}
      </span>
    );
  }

  return weight ? <span className={weight}>{span.text}</span> : <>{span.text}</>;
}

export function InlineContent({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Span key={spanKey(index, span)} span={span} />
      ))}
    </>
  );
}
