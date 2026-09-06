import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface DistantTreesProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * "Алсын модод" (distant trees) — a register-child-only accent (node
 * 1218:13616) not present in the hero export: six blurred, differently
 * tinted ellipses standing in for a soft, out-of-focus tree line. Figma
 * blurs each ellipse individually (4.7px–6.4px); reproduced as one flat
 * `blur(6px)` group, the same simplification Hills.tsx already uses for its
 * shrub cluster.
 */
export default function DistantTrees({ className, style }: DistantTreesProps) {
  return (
    <svg viewBox="0 0 232.063 115.2" className={cn("absolute", className)} style={style} aria-hidden="true">
      <g style={{ filter: "blur(6px)" }}>
        <ellipse cx="96.4228" cy="65.3887" rx="45.2571" ry="28.8" fill="var(--color-bush-teal)" />
        <ellipse cx="166.394" cy="38.6743" rx="18.5143" ry="26.7429" fill="var(--color-bush)" />
        <ellipse cx="149.937" cy="75.7026" rx="18.5143" ry="26.7429" fill="var(--color-bush-peach)" />
        <ellipse cx="200.794" cy="69.0171" rx="24.6857" ry="39.0857" fill="var(--color-bush-gray)" />
        <ellipse cx="47.0799" cy="75.7026" rx="14.4" ry="18.5143" fill="var(--color-bush-mint)" />
        <ellipse cx="29.6229" cy="68.56" rx="18.5143" ry="22.6286" fill="var(--color-bush-blue)" />
      </g>
    </svg>
  );
}
