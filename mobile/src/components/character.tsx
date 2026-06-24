import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type CharacterVariant = 'idle' | 'listening';
/** Glow color of the globe art. `purple` is the diagnostic screen; `red` the listen screen. */
export type CharacterAccent = 'purple' | 'red';

type CharacterProps = {
  variant?: CharacterVariant;
  accent?: CharacterAccent;
  size?: number;
  style?: ViewStyle;
};

const SOURCES = {
  purple: {
    idle: require('@/assets/images/orto/globe-idle.png'),
    listening: require('@/assets/images/orto/globe-listening.png'),
  },
  red: {
    idle: require('@/assets/images/orto/globe-idle-red.png'),
    listening: require('@/assets/images/orto/globe-listening-red.png'),
  },
} as const;

/**
 * Earth-globe mascot for the diagnostic / listen screens.
 * Swap the require() calls for a Rive/Lottie player when animation is ready —
 * nothing else in the app changes.
 */
export function Character({ variant = 'idle', accent = 'purple', size = 120, style }: CharacterProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={SOURCES[accent][variant]}
        style={styles.fill}
        contentFit="contain"
        accessibilityLabel="ОРТО дэлхий"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
