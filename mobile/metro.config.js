// Lets `import Star from '@/assets/onboarding/slide1/star1.svg'` resolve to a React
// component instead of an image asset, so the onboarding art scales crisply at any
// screen size. Transform-time only — react-native-svg-transformer ships no native
// code, so this needs `npx expo start --clear`, not a dev-client rebuild.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
