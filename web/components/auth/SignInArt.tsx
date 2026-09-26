import Image from "next/image";
import Mascot, { MASCOT_BOX, MASCOT_SPHERE } from "@/components/brand/Mascot";

// Frame 7:4257's cloud ("Union" 7:5712) is the same 503.172 x 356.962 shape
// the landing hero draws (1360:8712), so it reuses that export. The mascot
// ("Sound idle component" 7:5731) is Mascot.tsx placed by its body circle:
// 156.041px across, centred 205.6 / 193.3px into the cloud's box.
const CLOUD = { width: 503.172, height: 356.962, bleedX: 28, bleedY: 16 };
const SPHERE = { diameter: 156.041, cx: 205.6, cy: 193.3 };
const MASCOT_SCALE = SPHERE.diameter / (2 * MASCOT_SPHERE.r);
const MASCOT_WIDTH = MASCOT_BOX.width * MASCOT_SCALE;

const pctX = (px: number) => `${(px / CLOUD.width) * 100}%`;
const pctY = (px: number) => `${(px / CLOUD.height) * 100}%`;

/** The cloud and mascot beside the sign-in card. Decorative, wide screens only. */
export default function SignInArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden w-[503px] shrink-0 xl:block"
      style={{ aspectRatio: `${CLOUD.width} / ${CLOUD.height}` }}
    >
      <Image
        src="/images/landing/hero-cloud.svg"
        alt=""
        width={CLOUD.width + 2 * CLOUD.bleedX}
        height={CLOUD.height + 2 * CLOUD.bleedY}
        unoptimized
        loading="eager"
        className="absolute max-w-none"
        style={{
          left: pctX(-CLOUD.bleedX),
          top: pctY(-CLOUD.bleedY),
          width: pctX(CLOUD.width + 2 * CLOUD.bleedX),
          height: pctY(CLOUD.height + 2 * CLOUD.bleedY),
        }}
      />
      <div
        className="absolute"
        style={{
          left: pctX(SPHERE.cx - MASCOT_SPHERE.cx * MASCOT_SCALE),
          top: pctY(SPHERE.cy - MASCOT_SPHERE.cy * MASCOT_SCALE),
          width: pctX(MASCOT_WIDTH),
        }}
      >
        <Mascot decorative />
      </div>
    </div>
  );
}
