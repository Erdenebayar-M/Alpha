import { CloudShape, type CloudShapeProps } from "@/components/decor/CloudShape";

/**
 * The register-child background's 12 clouds (node 1218:13206), positioned as
 * percentages of its 1440x1202 artwork crop — taller than the hero's 927px
 * crop of the same artboard, so these percentages are recomputed from the
 * Figma export rather than reused from Clouds.tsx. The first 8 sit at the
 * same pixel coordinates as the hero's own clouds; the last 4 (lower,
 * rotated) are unique to this frame. Opacity tiers (1 / 0.96 / 0.9) follow
 * the same near-to-far convention Clouds.tsx already uses.
 *
 * The landing redesign's artwork (node 1360:8563) repeats all 12 at identical
 * geometry (every cloud node shares x/y/size/rotation with its 1218:13207
 * twin), so LandingScene renders this same set — with `animated={false}`,
 * since that page ships without motion for now.
 */
const REGISTER_CLOUDS: CloudShapeProps[] = [
  { left: 3.429, top: 6.161, width: 14.857, height: 7.531, opacity: 1, drift: "slow" },
  { left: 8.571, top: 3.423, width: 10.857, height: 6.846, opacity: 1, drift: "slow" },
  { left: 14.857, top: 5.477, width: 8.571, height: 6.161, opacity: 1, drift: "slow" },
  { left: 80.571, top: 7.531, width: 16.571, height: 7.531, opacity: 0.96, drift: "slower" },
  { left: 86.857, top: 4.107, width: 12.571, height: 6.846, opacity: 0.96, drift: "slower" },
  { left: 93.143, top: 3.423, width: 10.286, height: 6.161, opacity: 0.96, drift: "slower" },
  { left: 45.714, top: 9.584, width: 11.429, height: 5.477, opacity: 0.9, drift: "slow" },
  { left: 50.286, top: 6.846, width: 8, height: 4.792, opacity: 0.9, drift: "slow" },
  { left: 64.167, top: 20.853, width: 17.356, height: 10.569, opacity: 0.9, drift: "slower" },
  { left: 18.766, top: 25.791, width: 15.343, height: 7.977, opacity: 0.9, drift: "slower" },
  { left: 15.522, top: 24.126, width: 12.802, height: 9.312, opacity: 0.9, drift: "slow" },
  { left: 8.75, top: 27.732, width: 12.388, height: 8.215, opacity: 0.9, drift: "slow" },
];

export default function RegisterClouds({ animated = true }: { animated?: boolean }) {
  return (
    <>
      {REGISTER_CLOUDS.map(({ drift, ...cloud }, i) => (
        <CloudShape key={i} {...cloud} drift={animated ? drift : undefined} />
      ))}
    </>
  );
}
