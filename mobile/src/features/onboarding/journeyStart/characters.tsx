import type { CharacterArt } from '@/src/features/onboarding/characters';
import type { Leaf } from '@/src/features/onboarding/FigmaBoard';

// ORto (Figma "Double Orto", node 204:11248) — the blue gradient blob, bottom-left.
import OrtoBodyGradient from '@/assets/onboarding/journey-start/orto/body-gradient-circle.svg';
import OrtoBottomShade from '@/assets/onboarding/journey-start/orto/bottom-blue-shade.svg';
import OrtoEllipse41 from '@/assets/onboarding/journey-start/orto/ellipse41.svg';
import OrtoEllipse42 from '@/assets/onboarding/journey-start/orto/ellipse42.svg';
import OrtoEllipse43 from '@/assets/onboarding/journey-start/orto/ellipse43.svg';
import OrtoEllipse44 from '@/assets/onboarding/journey-start/orto/ellipse44.svg';
import ortoEyebrow from '@/assets/onboarding/journey-start/orto/eyebrow.svg';
import ortoFace from '@/assets/onboarding/journey-start/orto/face.svg';
import ortoTopHighlight from '@/assets/onboarding/journey-start/orto/top-highlight.svg';

// Pinky (node 204:11331) — the small magenta teardrop, top-centre.
import PinkyBody from '@/assets/onboarding/journey-start/pinky/body.svg';
import PinkyBodyShade from '@/assets/onboarding/journey-start/pinky/body-shade.svg';
import PinkyFace from '@/assets/onboarding/journey-start/pinky/face.svg';
import pinkyMaskHighlight from '@/assets/onboarding/journey-start/pinky/mask-highlight.svg';
import pinkyMaskShadow from '@/assets/onboarding/journey-start/pinky/mask-shadow.svg';

// Greeny (node 204:11428) — the green tree/hill mascot, centre.
import greenyBody from '@/assets/onboarding/journey-start/greeny/body.svg';
import greenyEye from '@/assets/onboarding/journey-start/greeny/eye.svg';
import greenyHair from '@/assets/onboarding/journey-start/greeny/hair.svg';
import greenyHand1 from '@/assets/onboarding/journey-start/greeny/hand1.svg';
import greenyHand2 from '@/assets/onboarding/journey-start/greeny/hand2.svg';
import greenySmile from '@/assets/onboarding/journey-start/greeny/smile.svg';

// Нархан (node 204:11484) — the yellow/orange mascot, bottom-right.
import narhanBow from '@/assets/onboarding/journey-start/narhan/bow.svg';
import narhanCurlyHair from '@/assets/onboarding/journey-start/narhan/curly-hair.svg';
import narhanDecoration from '@/assets/onboarding/journey-start/narhan/decoration.svg';
import NarhanEllipse12 from '@/assets/onboarding/journey-start/narhan/ellipse12.svg';
import NarhanEllipse13 from '@/assets/onboarding/journey-start/narhan/ellipse13.svg';
import NarhanEye from '@/assets/onboarding/journey-start/narhan/eye.svg';
import narhanWinkDetail from '@/assets/onboarding/journey-start/narhan/wink-detail.svg';

/**
 * Every masked/decorative cluster below is exported straight from Figma as a
 * per-node SVG (`download_assets(nodeId, format: "svg")`), not a flattened PNG —
 * react-native-svg (v15) renders `<mask>`, gradients, and `<filter>` natively
 * (see `slide1/*` and `gender/boy/*`, which already ship the same primitives), so
 * there's no need to fall back to a raster composite here. Each export box is
 * exactly the node's own bounding box, so it drops straight into the existing
 * `box`/`size` geometry below. The plain, unmasked, explicitly-sized leaves (body
 * shapes, simple ellipses, the two `eye` leaves, `Царай`/face) were already
 * individual SVG leaves, so eyes stay independently blinkable via `withBlink`.
 */

// ---------------------------------------------------------------------------
// ORto — a small gradient sphere with a highlight, eyebrow and face.
// ---------------------------------------------------------------------------

export const ORTO: CharacterArt = {
  size: { width: 152.415, height: 138.817 },
  leaves: [
    { Art: OrtoBodyGradient, box: { left: 14.208, top: 9.304, width: 130.806, height: 125.404 }, size: { width: 117.327, height: 111.054 }, rotate: -7.49 },
    { Art: OrtoBottomShade, box: { left: 14.208, top: 9.304, width: 130.806, height: 125.404 }, size: { width: 117.327, height: 111.054 }, rotate: -7.49 },
    { Art: ortoTopHighlight, box: { left: 14.208, top: 9.304, width: 130.806, height: 125.404 } },
    // These four glow ellipses' exported SVGs bleed well past their nominal Figma
    // box (a soft blur baked into the asset) — sized to the SVG's own intrinsic
    // width/height, centred in the same outer box, rather than the tight nominal size.
    { Art: OrtoEllipse41, box: { left: 83.958, top: 8.384, width: 50.936, height: 44.043 }, size: { width: 101.408, height: 89.742 }, rotate: 7.69, skewX: -1.75 },
    { Art: OrtoEllipse44, box: { left: 54.958, top: 56.114, width: 49.825, height: 43.931 }, size: { width: 105.209, height: 98.364 }, rotate: -7.49 },
    { Art: OrtoEllipse42, box: { left: 106.598, top: 37.764, width: 37.413, height: 45.25 }, size: { width: 86.91, height: 99.897 }, rotate: -7.49 },
    { Art: OrtoEllipse43, box: { left: 50.328, top: 30.064, width: 42.105, height: 33.08 }, size: { width: 98.75, height: 88.268 }, rotate: -7.49 },
    { Art: ortoEyebrow, box: { left: 1.058, top: 7.709, width: 107, height: 64 } },
    { Art: ortoFace, box: { left: 66.611, top: 34.329, width: 53, height: 53 } },
  ],
};

// ---------------------------------------------------------------------------
// Pinky — a magenta teardrop, tilted, with a body-shading mask and a small face.
// ---------------------------------------------------------------------------

const PINKY_INNER: readonly Leaf[] = [
  { Art: PinkyBody, box: { left: 16.118, top: 22.01, width: 52.465, height: 49.891 } },
  { Art: PinkyBodyShade, box: { left: 16.17, top: 22.527, width: 52.473, height: 49.761 } },
  { Art: pinkyMaskHighlight, box: { left: 11.85, top: 19.46, width: 61, height: 55 } },
  { Art: pinkyMaskShadow, box: { left: -1.15, top: 15.96, width: 87, height: 62 } },
  { Art: PinkyFace, box: { left: 35.236, top: 39.18, width: 16.153, height: 10.458 } },
];

export const PINKY: CharacterArt = {
  size: { width: 86.496, height: 84.007 },
  leaves: [
    {
      box: { left: 0, top: 0, width: 86.496, height: 84.007 },
      size: { width: 84.701, height: 82.155 },
      rotate: -1.27,
      board: { width: 84.701, height: 82.155, leaves: PINKY_INNER },
    },
  ],
};

// ---------------------------------------------------------------------------
// Greeny — body/tree cluster flattened (heavy mask use), eye/mouth/hair/hands kept
// separate so the face can still blink.
// ---------------------------------------------------------------------------

export const GREENY: CharacterArt = {
  size: { width: 202.415, height: 200.669 },
  leaves: [
    // These boxes are template-matched against the Figma page render (not the
    // per-node metadata, which disagreed with where the art actually falls) —
    // see the journey-start-page plan notes for the matching method. greenyBody
    // and greenyHand2 are legitimately clipped by the page frame's left edge in
    // Figma itself (their own node screenshot renders clipped the same way), so
    // their boxes are intentionally cut off at the board's left edge, not a bug.
    { Art: greenyBody, box: { left: -9.73, top: 36.1, width: 81, height: 135 } },
    { Art: greenyHair, box: { left: 11.27, top: 43.1, width: 50, height: 57 } },
    { Art: greenyHand1, box: { left: 29.27, top: 109.1, width: 48, height: 40 } },
    { Art: greenyHand2, box: { left: -9.73, top: 40.1, width: 21, height: 43 } },
    { Art: greenyEye, box: { left: -1.73, top: 64.1, width: 46, height: 47 } },
    { Art: greenySmile, box: { left: -1.73, top: 93.1, width: 20, height: 19 } },
  ],
};

// ---------------------------------------------------------------------------
// Нархан — the yellow/orange mascot: two body ellipses, a flattened flower/hill
// decoration, curly hair, a bow, wink detail, and a separately-blinkable eye.
// ---------------------------------------------------------------------------

export const NARHAN: CharacterArt = {
  size: { width: 168.999, height: 156.9996 },
  leaves: [
    { Art: NarhanEllipse12, box: { left: 0.99, top: 0, width: 168.005, height: 156.152 }, size: { width: 134.638, height: 127.098 }, rotate: 15, skewX: -2.37 },
    {
      Art: NarhanEllipse13,
      box: { left: 0, top: 0.7, width: 168.546, height: 156.296 },
      size: { width: 135.198, height: 127.098 },
      rotate: 15,
      skewX: -2.37,
      expand: [-15.74, -14.79, -15.74, -14.79],
    },
    { Art: narhanDecoration, box: { left: 6.149, top: 0.704, width: 156, height: 156 } },
    { Art: narhanCurlyHair, box: { left: 90.756, top: 8.366, width: 77, height: 65 } },
    { Art: narhanWinkDetail, box: { left: 48.353, top: 19.876, width: 33, height: 22 } },
    { Art: narhanBow, box: { left: 128.22, top: 38.075, width: 21, height: 17 } },
    { Art: NarhanEye, box: { left: 37.7, top: 32.26, width: 70.04, height: 70.23 }, expand: [0, 0, -1.75, 0] },
  ],
};
