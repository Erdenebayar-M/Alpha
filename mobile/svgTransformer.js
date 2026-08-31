/**
 * Metro babel transformer for `.svg` imports.
 *
 * `react-native-svg-transformer` (the usual choice) runs SVGR with `native: true`,
 * which maps SVG tags to react-native-svg components via a hard-coded allowlist
 * (`@svgr/babel-plugin-transform-react-native-svg`'s `elementToComponent`). That list
 * has no entry for `filter`/`feGaussianBlur`/`feFlood`/`feBlend`/`feColorMatrix`/
 * `feComposite`/`feOffset`/`feMerge` — SVGR silently deletes every element it doesn't
 * recognise, so all `<filter>` definitions vanish while the `filter="url(#id)"`
 * reference on the shape survives and points at nothing. The visible result: every
 * blurred/soft-edged asset (mascot glows, drop shadows, background blobs) renders
 * hard-edged.
 *
 * This used to route around that gap by shipping the (lightly sanitised) SVG source
 * as a string and parsing it at runtime via `SvgXml` — `SvgXml` parses against
 * react-native-svg's own tag map (`xmlTags.ts`), which does include every filter
 * primitive. That worked, but every mounted instance re-ran a hand-written
 * character-by-character XML parser on the JS thread: a screen with dozens of SVGs
 * (e.g. the onboarding intro slide's ~66 layered assets) paid for dozens of full XML
 * parses on every mount. `svgToJsx.js` closes the actual SVGR gap instead — it's a
 * from-scratch compiler that includes the filter primitives xmlTags.ts has and SVGR
 * doesn't — so this file now compiles straight to `react-native-svg` JSX at build
 * time via `svgToJsx.compileToSource`, with zero runtime parsing. Call sites are
 * unaffected: `<Art width="100%" height="100%" />` still works, since the compiled
 * component spreads incoming props over the parsed root `<svg>` attributes, same as
 * `SvgXml`'s `override` did.
 */

const getExpoTransformer = () => {
  try {
    return require('@expo/metro-config/babel-transformer');
  } catch {
    try {
      return require('expo/node_modules/@expo/metro-config/babel-transformer');
    } catch {
      return null;
    }
  }
};

const expoTransformer = getExpoTransformer();
const { compileToSource } = require('./svgToJsx');

/**
 * Figma's SVG export puts exactly three kinds of `style="…"` attribute on these
 * assets (verified across all 127 files currently in `assets/`) — none of which
 * `SvgXml`'s naive `style` → RN-style-object parser (`getStyle` in
 * react-native-svg's `xml.tsx`) should be allowed to touch directly:
 *
 *  - `style="display: block;"` on the root `<svg>` — a CSS default with no RN
 *    equivalent; purely informational, safe to drop.
 *  - `style="mask-type:alpha"` on `<mask>` — not a valid RN style value, but
 *    `mask-type` IS a real SVG/react-native-svg attribute `Mask` understands, so
 *    this is promoted from style to attribute rather than dropped.
 *  - `style="backdrop-filter:…;clip-path:url(#…);height:100%;width:100%"` —
 *    react-native-svg supports neither `backdrop-filter` nor `clip-path` via style;
 *    this was already inert before this change, so it's dropped with no regression.
 *
 * Anything else warns instead of silently producing a bogus style object, so a
 * future Figma export with a real style declaration surfaces at build time.
 */
function sanitizeSvg(src, filename) {
  let out = src;

  out = out.replace(/\sstyle="display:\s*block;?"/g, '');
  out = out.replace(/\sstyle="mask-type:\s*alpha;?"/g, ' mask-type="alpha"');
  out = out.replace(/\sstyle="backdrop-filter:[^"]*"/g, '');

  const leftover = out.match(/\sstyle="[^"]*"/g);
  if (leftover) {
    console.warn(`[svgTransformer] unexpected style attr(s) in ${filename}: ${leftover.join(', ')}`);
  }

  return out;
}

module.exports.transform = async ({ src, filename, ...rest }) => {
  if (filename.endsWith('.svg')) {
    const code = compileToSource(sanitizeSvg(src, filename), filename);
    return expoTransformer.transform({ src: code, filename, ...rest });
  }
  return expoTransformer.transform({ src, filename, ...rest });
};

module.exports.sanitizeSvg = sanitizeSvg;
