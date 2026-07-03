import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface PuzzleCardProps {
  variant: 'image' | 'word';
  width: number;
  height: number;
  imageUrl?: string;
  text?: string;
  /** Left (image) card the child has tapped but not yet linked. */
  selected?: boolean;
  /** A dragged piece is hovering over this drop target — invite the snap. */
  hovered?: boolean;
  /** Committed link — the word card fills lavender and pops into place. */
  locked?: boolean;
  /** Flip true to play a one-off "no" shake (wrong link in correct-only mode). */
  rejected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * One card in the connect-two-columns task. The image card (left) carries a
 * convex knob on its right edge; the word card (right) carries a matching
 * concave socket on its left edge — together they read as an interlocking
 * puzzle joint. A linked word card fills lavender.
 */
export default function PuzzleCard({
  variant,
  width,
  height,
  imageUrl,
  text,
  selected = false,
  hovered = false,
  locked = false,
  rejected = false,
  onPress,
  disabled = false,
}: PuzzleCardProps) {
  const knob = Math.round(height * 0.33);
  const isImage = variant === 'image';

  // Horizontal shake on a rejected link.
  const shakeX = useSharedValue(0);
  useEffect(() => {
    if (!rejected) return;
    shakeX.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [rejected, shakeX]);

  // Scale reacts to two things: a gentle swell while a piece hovers over this
  // target, and a springy "pop" the moment it locks (the puzzle click).
  const pop = useSharedValue(1);
  const wasLocked = useRef(locked);
  useEffect(() => {
    if (locked && !wasLocked.current) {
      pop.value = withSequence(
        withTiming(1.14, { duration: 120 }),
        withSpring(1, { damping: 6, stiffness: 220 })
      );
    }
    wasLocked.current = locked;
  }, [locked, pop]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: pop.value * (hovered ? 1.04 : 1) }],
  }));

  const cardBg = locked ? colors.matchLockedBg : colors.white;
  const borderColor = hovered
    ? colors.primaryBlue
    : selected
      ? colors.choiceSelectedBorder
      : 'transparent';

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          {
            width,
            height,
            borderRadius: Math.round(height * 0.18),
            backgroundColor: cardBg,
            borderColor,
            borderStyle: hovered ? 'dashed' : 'solid',
          },
          pressed && !disabled ? styles.pressed : null,
        ]}
      >
        {isImage ? (
          imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.image, { width: width * 0.56, height: height * 0.72, borderRadius: 20 }]}
              contentFit="contain"
              transition={150}
            />
          ) : null
        ) : (
          <Text style={styles.word} numberOfLines={1}>
            {text}
          </Text>
        )}

        {/* Interlock joint: convex white knob poking off the image card's right
            edge; concave socket (page-coloured bite) on the word card's left edge. */}
        {isImage ? (
          <View
            style={[
              styles.knob,
              {
                width: knob,
                height: knob,
                borderRadius: knob / 2,
                right: -knob / 2,
                top: height / 2 - knob / 2,
                backgroundColor: colors.white,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.socket,
              {
                width: knob,
                height: knob,
                borderRadius: knob / 2,
                left: -knob / 2,
                top: height / 2 - knob / 2,
                backgroundColor: colors.background,
              },
            ]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    // knob/socket must be visible past the card edge
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  image: {
    backgroundColor: colors.white,
  },
  word: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textChoice,
    textAlign: 'center',
  },
  knob: {
    position: 'absolute',
    // sits above the neighbouring socket so the joint reads as interlocked
    zIndex: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  socket: {
    position: 'absolute',
    zIndex: 2,
  },
});
