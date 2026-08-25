// Nunito is the brand font. It ships full Cyrillic Extended coverage, so the
// Mongolian-specific glyphs Өө / Үү render correctly (verified against the TTF cmap).
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
  // Nunito Sans — the onboarding message slides (Figma 142:1677 / 142:1839) spec this
  // family specifically, distinct from Nunito. Instantiated as static weights from
  // Google Fonts' variable NunitoSans[YTLC,opsz,wdth,wght].ttf at wght 400/900, with
  // wdth/YTLC/opsz pinned to Figma's own fontVariationSettings (wdth 100, YTLC 500).
  // Cyrillic Өө/Үү coverage verified against the TTF cmap, same as Nunito above.
  sansRegular: 'NunitoSans_400Regular',
  sansBlack: 'NunitoSans_900Black',
} as const;

// Map consumed by expo-font's `useFonts` at app startup.
export const fontAssets = {
  Nunito_400Regular: require('@/assets/fonts/Nunito_400Regular.ttf'),
  Nunito_600SemiBold: require('@/assets/fonts/Nunito_600SemiBold.ttf'),
  Nunito_700Bold: require('@/assets/fonts/Nunito_700Bold.ttf'),
  Nunito_800ExtraBold: require('@/assets/fonts/Nunito_800ExtraBold.ttf'),
  Nunito_900Black: require('@/assets/fonts/Nunito_900Black.ttf'),
  NunitoSans_400Regular: require('@/assets/fonts/NunitoSans_400Regular.ttf'),
  NunitoSans_900Black: require('@/assets/fonts/NunitoSans_900Black.ttf'),
};
