// Lets `import Star from '@/assets/onboarding/slide1/star1.svg'` resolve to a React
// component instead of an image asset, so the onboarding art scales crisply at any
// screen size. Transform-time only.
//
// Uses `./svgTransformer.js`, not `react-native-svg-transformer` (still an installed
// dependency but unused here) — SVGR's react-native output silently drops every
// `<filter>` element (no entry for it in its element allowlist), which broke every
// blurred/soft-edged asset in the app. See svgTransformer.js for the full story.
// This needs `npx expo start --clear`, not a dev-client rebuild — no native code.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('./svgTransformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
