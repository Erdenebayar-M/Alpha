import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import Mascot, { MASCOT_BOX, MASCOT_SPHERE } from "@/components/brand/Mascot";

interface ListeningMascotProps {
  /** Mirrors mobile's `CharacterAvatar`'s `playing` prop: audio is playing,
   *  so the mascot "listens" — eyes closed, halo pulsing, sound waves and
   *  dots animating around it. */
  playing: boolean;
  className?: string;
}

/* ---------------------------------------------------------------------------
 * Mobile's chrome, expressed in Mascot's viewBox.
 *
 * mobile/.../CharacterAvatar.tsx lays its wave bars and dots out in a
 * 164.779 x 179 box — the Figma "Sound component" at 0.5843 scale. Mascot
 * draws that same component at its native 282 wide, sharing its top edge, so
 * every size and cadence below is mobile's own number scaled by `ms`.
 *
 * The clearances are the one thing not taken from mobile. mobile nudges its
 * body PNG 3.9% right inside that box, so what its `left/right: -6` actually
 * clears differs side to side; ported literally onto this artwork the bars
 * landed ~2 units off the right earbud and read as touching the character. So
 * the horizontal placement is measured from the silhouette instead (see
 * EARBUD_REACH), which puts the row outside Mascot's own box — hence the
 * overlay's canvas is padded by OVERHANG on each side.
 * ------------------------------------------------------------------------- */
const MOBILE_BOX = { width: 164.779, height: 179 };
const K = 282 / MOBILE_BOX.width; // ≈ 1.7114 viewBox units per mobile px
/** A mobile length — or a y coordinate, the two boxes sharing a top edge. */
const ms = (v: number) => v * K;

const CENTER_X = MASCOT_BOX.width / 2;
/** How far the earbuds reach from the centre (their paths run from x 44.99 to
 *  x 259.85 in Mascot): at the wave row's height they, not the sphere, are the
 *  outermost part of the character. Taking the larger of the two keeps the
 *  clusters symmetric about the box. */
const EARBUD_REACH = Math.max(CENTER_X - 44.99, 259.85 - CENTER_X);
/** Air between the character's silhouette and the nearest bar / dot. */
const WAVE_CLEARANCE = 16;
const DOTS_CLEARANCE = 12;

// Inner -> outer bar heights (the outermost bar is the tallest).
const WAVE_BAR_HEIGHTS = [11.5, 15.7, 19.8, 24];
const WAVE_MAX_H = 24;
const WAVE_BAR_W = 3.4;
const WAVE_GAP = 3.4;
/** Mobile's `top: height * 0.32`, the row centred on its tallest bar. */
const WAVE_ROW_TOP = 0.32;
/** One grow (or one shrink). `globals.css` runs the full cycle at 2x this. */
const WAVE_PERIOD_MS = 950;
const WAVE_WHITE = "#eff5fe";
const WAVE_BLUE = "#5088ee";

const DOTS_COUNT = 4;
const DOT_SIZE = 5;
const DOT_GAP = 4;

/** Total width of a run of `count` items of `size` separated by `gap`. */
const runWidth = (count: number, size: number, gap: number) => count * size + (count - 1) * gap;

const WAVE_ROW_W = ms(runWidth(WAVE_BAR_HEIGHTS.length, WAVE_BAR_W, WAVE_GAP));
const WAVE_ROW_CENTER_Y = ms(MOBILE_BOX.height * WAVE_ROW_TOP + WAVE_MAX_H / 2);
/** The bar nearest the character, as a distance from the box's centre. */
const WAVE_INNER_X = EARBUD_REACH + WAVE_CLEARANCE;

const DOTS_ROW_W = ms(runWidth(DOTS_COUNT, DOT_SIZE, DOT_GAP));
const DOT_R = ms(DOT_SIZE) / 2;
/** Mobile puts the dots at `height * 0.88`, which lands them on this sphere's
 *  bottom edge — sat under it instead, by the same rule as the bars. */
const DOTS_ROW_CENTER_Y = MASCOT_SPHERE.cy + MASCOT_SPHERE.r + DOTS_CLEARANCE + DOT_R;

/** How far the chrome reaches past Mascot's own box, so the overlay can be
 *  drawn on a canvas wide enough to hold it (an SVG clips its viewBox). */
const OVERHANG = Math.ceil(WAVE_INNER_X + WAVE_ROW_W - CENTER_X);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function lerpHex(from: string, to: string, t: number) {
  const channels = [1, 3, 5].map((at) => {
    const a = parseInt(from.slice(at, at + 2), 16);
    const b = parseInt(to.slice(at, at + 2), 16);
    return Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/**
 * A bar's colour at a given scale, mobile's rule exactly: `interpolateColor`
 * over `scaleY * (height / max)` mapped from [0.2, 1] onto white -> blue. It
 * tracks the bar's *live* height, so the blue peak travels with the tall bar
 * and the short bars never reach full blue.
 */
const waveFill = (barHeight: number, scaleY: number) =>
  lerpHex(WAVE_WHITE, WAVE_BLUE, clamp01(((scaleY * barHeight) / WAVE_MAX_H - 0.2) / 0.8));

/**
 * Wraps the brand `Mascot` with the "listening" chrome mobile's
 * `CharacterAvatar` draws around its character while audio plays: two
 * mirrored wave-bar clusters flanking it and a row of pulsing dots beneath.
 * Only mounted here — `Mascot` itself stays the plain idle character
 * everywhere else it's used.
 *
 * Drawn as an SVG overlay in Mascot's own coordinates — widened by OVERHANG
 * on each side, and offset to match, so a unit stays a unit — which is what
 * lets the chrome scale with the character (mobile scales it by
 * `width / 164.779`) instead of sitting at a fixed pixel size. It deliberately
 * sits *outside* the floating mascot, as mobile keeps its clusters outside the
 * bob-animated view.
 *
 * One divergence from mobile, on purpose: mobile is completely static when
 * idle and only bobs while playing, whereas `Mascot` floats unconditionally
 * at every call site on this site. Changing that would touch the Hero too.
 */
export default function ListeningMascot({ playing, className }: ListeningMascotProps) {
  return (
    <div className={cn("relative", className)}>
      <Mascot decorative playing={playing} className="w-full" />

      {playing ? (
        <svg
          viewBox={`${-OVERHANG} 0 ${MASCOT_BOX.width + OVERHANG * 2} ${MASCOT_BOX.height}`}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 h-full"
          style={{
            left: `${(-OVERHANG / MASCOT_BOX.width) * 100}%`,
            width: `${((MASCOT_BOX.width + OVERHANG * 2) / MASCOT_BOX.width) * 100}%`,
          }}
        >
          <WaveCluster side="left" />
          <WaveCluster side="right" />
          <DotsRow />
        </svg>
      ) : null}
    </div>
  );
}

function WaveCluster({ side }: { side: "left" | "right" }) {
  const heights = side === "left" ? [...WAVE_BAR_HEIGHTS].reverse() : WAVE_BAR_HEIGHTS;
  const startX =
    side === "left" ? CENTER_X - WAVE_INNER_X - WAVE_ROW_W : CENTER_X + WAVE_INNER_X;

  return (
    <g>
      {heights.map((h, index) => {
        // innerRank = 0 for the bar nearest the sphere, so the pulse travels outward.
        const innerRank = side === "left" ? heights.length - 1 - index : index;
        const height = ms(h);
        return (
          <rect
            key={index}
            className="animate-wave-bar"
            x={startX + ms(index * (WAVE_BAR_W + WAVE_GAP))}
            y={WAVE_ROW_CENTER_Y - height / 2}
            width={ms(WAVE_BAR_W)}
            height={height}
            rx={ms(WAVE_BAR_W) / 2}
            // The attribute is what a bar shows with the animation off (reduced
            // motion); the keyframes take over otherwise. Without it — and
            // without `backwards` in globals.css — a bar would sit at an SVG
            // rect's default black for the length of its delay.
            fill={waveFill(h, 1)}
            style={
              {
                animationDelay: `${innerRank * (WAVE_PERIOD_MS / 2)}ms`,
                "--wave-from": waveFill(h, 0.4),
                "--wave-to": waveFill(h, 1),
              } as CSSProperties
            }
          />
        );
      })}
    </g>
  );
}

function DotsRow() {
  const firstCenterX = CENTER_X - DOTS_ROW_W / 2 + DOT_R;

  return (
    <g>
      {Array.from({ length: DOTS_COUNT }).map((_, index) => (
        <circle
          key={index}
          className="animate-wave-dot"
          cx={firstCenterX + ms(index * (DOT_SIZE + DOT_GAP))}
          cy={DOTS_ROW_CENTER_Y}
          r={DOT_R}
          fill={WAVE_BLUE}
          style={{ animationDelay: `${index * (WAVE_PERIOD_MS / 2)}ms` }}
        />
      ))}
    </g>
  );
}
