import { cn } from "@/lib/cn";

interface CloudProps {
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
 * Positions/sizes/opacities are the exact cx/cy/rx/ry values from the
 * export, converted to percentages of the 1440x927 artwork crop (see
 * Hills.tsx for why 927, not the full 1327) so they track the Hills SVG
 * underneath.
 */
function Cloud({ left, top, width, height, opacity, drift }: CloudProps) {
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

export default function Clouds() {
  return (
    <>
      <Cloud left={3.429} top={7.989} width={14.857} height={9.764} opacity={1} drift="slow" />
      <Cloud left={8.571} top={4.438} width={10.857} height={8.877} opacity={1} drift="slow" />
      <Cloud left={14.857} top={7.101} width={8.571} height={7.989} opacity={1} drift="slow" />
      <Cloud left={80.571} top={9.764} width={16.571} height={9.764} opacity={0.96} drift="slower" />
      <Cloud left={64.559} top={24.947} width={16.571} height={9.764} opacity={0.96} drift="slower" />
      <Cloud left={86.857} top={5.326} width={12.571} height={8.877} opacity={0.96} drift="slower" />
      <Cloud left={93.143} top={4.438} width={10.286} height={7.989} opacity={0.96} drift="slower" />
      <Cloud left={45.714} top={12.427} width={11.429} height={7.101} opacity={0.9} drift="slow" />
      <Cloud left={50.286} top={8.877} width={8} height={6.214} opacity={0.9} drift="slow" />
    </>
  );
}
