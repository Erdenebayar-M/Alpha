import { cn } from "@/lib/cn";

export interface CloudShapeProps {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  drift?: "slow" | "slower";
}

/**
 * Every sky cloud in the Figma export (node 1195:6160) is a single blurred
 * white ellipse (~700 bytes, `<ellipse fill="white" filter="blur(~4)"/>`) —
 * an opaque shape with the filter only softening its edge, not a shape that
 * fades to transparent before it reaches its own boundary. Reproduced here
 * as a solid white div plus a CSS blur instead of an SVG + feGaussianBlur
 * filter — visually identical softness, no filter region to rasterize on
 * every animation frame. A radial-gradient fill was tried first but doubles
 * up on the blur's own edge fade, making every cloud read as a hazy smear
 * rather than a distinct puffy shape — hence the flat opaque fill here.
 * Shared by Clouds.tsx (hero, 1440x927 crop) and RegisterClouds.tsx
 * (register-child flow, 1440x1202 crop) — each passes percentages of its
 * own crop height.
 */
export function CloudShape({ left, top, width, height, opacity, drift }: CloudShapeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute rounded-full bg-white",
        drift === "slow" && "animate-drift-slow will-change-transform",
        drift === "slower" && "animate-drift-slower will-change-transform"
      )}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        opacity,
        filter: "blur(4px)",
      }}
    />
  );
}
