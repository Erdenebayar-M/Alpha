import { PALETTE_COLORS, type ColorValue, type PaletteColor } from "./types";

const PALETTE_SET = new Set<string>(PALETTE_COLORS);

function isPaletteColor(color: ColorValue): color is PaletteColor {
  return PALETTE_SET.has(color);
}

/** The CSS value for a Colour used as a text colour (span color, heading color). */
export function colorCss(color: ColorValue): string {
  return isPaletteColor(color) ? `var(--color-palette-${color})` : color;
}

/**
 * The CSS value for a Colour used as a tinted background (span highlight,
 * Block background). Palette names resolve to a precomputed lighter token
 * (globals.css); a custom hex has no precomputed tint, so it's lightened at
 * render time with the same ~16% mix the precomputed tokens approximate.
 */
export function tintCss(color: ColorValue): string {
  return isPaletteColor(color) ? `var(--color-palette-${color}-tint)` : `color-mix(in srgb, ${color} 16%, white)`;
}
