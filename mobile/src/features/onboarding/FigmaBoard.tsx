import { type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

/**
 * Renders a Figma frame's children using Figma's own box language, so the character
 * data can be transcribed verbatim from the design context instead of being
 * pre-multiplied by hand.
 *
 * Three positioning forms cover everything the onboarding art uses:
 *  - `inset`  — [top, right, bottom, left] as % of the board (Figma's default)
 *  - `box`    — absolute left/top/width/height in board px
 *  - `expand` — the negative-inset wrapper Figma emits when a stroke or blur spills
 *               outside the layer's own box; percentages of the layer box
 * and `hypot` reproduces the rotated-box sizing Figma emits as
 * `w-[hypot(<a>cqw,<b>cqh)]`, where cqw/cqh are % of the containing box.
 */

/** [top, right, bottom, left], percentages. */
export type Inset = [number, number, number, number];

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Leaf {
  Art?: FC<SvgProps>;
  /** Position as % insets of the board. Mutually exclusive with `box`. */
  inset?: Inset;
  /** Position in board px. */
  box?: Box;
  /** Negative-inset wrapper around the art, as % of the layer box. */
  expand?: Inset;
  /** Rotated-box sizing: [aCqw, bCqh] pairs for width and height. */
  hypot?: { width: [number, number]; height: [number, number] };
  /** Explicit inner size, centred in the layer box — Figma's `flex-none` child. */
  size?: Size;
  /** Degrees. Applied about the layer's centre, as Figma does. */
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Nested board — a Figma sub-frame with its own coordinate space. */
  board?: Size & { leaves: readonly Leaf[] };
  /** Clip children to the layer box (Figma's `overflow-clip`). */
  clip?: boolean;
}

function boxFromInset(parent: Size, [t, r, b, l]: Inset): Box {
  const left = (l / 100) * parent.width;
  const top = (t / 100) * parent.height;
  return {
    left,
    top,
    width: parent.width - left - (r / 100) * parent.width,
    height: parent.height - top - (b / 100) * parent.height,
  };
}

/** Figma's `hypot(<a>cqw, <b>cqh)`: a rotated box's side length in the container's units. */
function hypotSize(container: Size, [cqw, cqh]: [number, number]): number {
  return Math.hypot((cqw / 100) * container.width, (cqh / 100) * container.height);
}

function resolveLeaf(parent: Size, leaf: Leaf) {
  // The layout box the leaf occupies in its parent.
  const outer = leaf.box ?? boxFromInset(parent, leaf.inset ?? [0, 0, 0, 0]);

  // A rotated or explicitly-sized leaf is centred in its layout box rather than
  // stretched to fill it — Figma's `flex items-center justify-center` + `flex-none`.
  const inner: Size = leaf.hypot
    ? { width: hypotSize(outer, leaf.hypot.width), height: hypotSize(outer, leaf.hypot.height) }
    : (leaf.size ?? { width: outer.width, height: outer.height });

  // The negative-inset wrapper grows the art beyond the layer box, keeping it anchored
  // to the edges Figma anchored it to.
  const art = leaf.expand
    ? {
        left: (leaf.expand[3] / 100) * inner.width,
        top: (leaf.expand[0] / 100) * inner.height,
        width: inner.width * (1 - leaf.expand[3] / 100 - leaf.expand[1] / 100),
        height: inner.height * (1 - leaf.expand[0] / 100 - leaf.expand[2] / 100),
      }
    : { left: 0, top: 0, width: inner.width, height: inner.height };

  return { outer, inner, art };
}

function BoardLeaf({ parent, leaf }: { parent: Size; leaf: Leaf }) {
  const { outer, inner, art } = resolveLeaf(parent, leaf);
  const { Art } = leaf;

  const transform = [
    ...(leaf.rotate ? [{ rotate: `${leaf.rotate}deg` }] : []),
    ...(leaf.flipX ? [{ scaleX: -1 }] : []),
    ...(leaf.flipY ? [{ scaleY: -1 }] : []),
  ];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.absolute,
        { left: outer.left, top: outer.top, width: outer.width, height: outer.height },
        // A hypot- or explicitly-sized leaf is centred in its layout box before rotating.
        leaf.hypot || leaf.size ? styles.centre : null,
        leaf.clip ? styles.clip : null,
      ]}
    >
      <View
        style={[
          { width: inner.width, height: inner.height },
          transform.length > 0 ? { transform } : null,
        ]}
      >
        {leaf.board ? (
          <FigmaBoard size={leaf.board} leaves={leaf.board.leaves} />
        ) : Art ? (
          <View
            style={[
              styles.absolute,
              { left: art.left, top: art.top, width: art.width, height: art.height },
            ]}
          >
            <Art width="100%" height="100%" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function FigmaBoard({ size, leaves }: { size: Size; leaves: readonly Leaf[] }) {
  return (
    <View pointerEvents="none" style={{ width: size.width, height: size.height }}>
      {leaves.map((leaf, i) => (
        <BoardLeaf key={i} parent={size} leaf={leaf} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
});
