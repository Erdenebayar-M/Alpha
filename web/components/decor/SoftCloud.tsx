import type { CSSProperties } from "react";

export type SoftCloudPosition = Pick<CSSProperties, "left" | "right" | "top" | "width" | "height">;

/**
 * One of the four large, faint "bg-cloud" blobs (a white ellipse at 35%
 * opacity with a 20px blur) that sit behind the scenery in both the
 * register-child background (nodes 1218:13397–13400) and the landing
 * redesign (nodes 1360:8847–8850). Each scene positions them in its own
 * units, so only the look is shared here.
 */
export function SoftCloud(position: SoftCloudPosition) {
  return <div className="absolute rounded-full bg-white" style={{ ...position, opacity: 0.35, filter: "blur(20px)" }} />;
}
