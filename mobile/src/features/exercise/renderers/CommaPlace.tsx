import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import PressableScale from '@/src/components/PressableScale';
import { BackspaceIcon } from '@/src/features/exercise/components/icons';
import DraggableMark from '@/src/features/exercise/components/DraggableMark';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import TalkingBuddy from '@/src/features/exercise/components/TalkingBuddy';
import { usePunctuationExercise } from '@/src/features/exercise/hooks/usePunctuationExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// The buddy asks the same thing on every place-the-comma task; the sentence tokens,
// candidate gaps, and correct gaps all live in options.punctuation (PunctuationOptions).
const BUBBLE_LABEL = 'Таслалыг хаана тавих вэ?';

// A dropped comma counts for the nearest gap only if the finger lands within this
// screen distance of the gap centre — keeps a drop onto empty space a no-op.
const DROP_RADIUS = 120;

// The dashed drop-ring size (matches the 24×24 Figma ellipse).
const RING = 24;

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The empty comma-drop target: a dashed orange ring drawn with svg (a dashed border on a
// circular View renders unevenly on iOS). Fills solid while a comma hovers over it.
function GapRing({ hovered }: { hovered: boolean }) {
  const r = RING / 2 - 1.5;
  return (
    <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={colors.gapRing}
        strokeWidth={2}
        strokeDasharray="3 3"
        fill={hovered ? colors.gapRing : 'none'}
      />
    </Svg>
  );
}

/**
 * "Place the comma between words" task ("Үгийн дунд таслал тавих"): the sentence is laid
 * out as plain navy words with a dashed orange ring at each candidate word boundary. The
 * child drags a comma from the infinite dispenser into a ring; a placed comma sits inline
 * where the ring was, and the backspace tile removes the last one. Naran reads the prompt
 * aloud. Grading is exact set-equality of placed gaps vs answer_gaps (in the hook).
 *
 * Twin of PunctuationPlace — same drag plumbing and answer hook — but the mark is a comma,
 * the words are unchipped, and gaps show as always-visible rings only at candidate indices.
 */
export default function CommaPlace({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const buddyWidth = Math.max(84, Math.min(width * 0.24, 108));
  const compact = height < 720;

  const ex = usePunctuationExercise(task, onResult);

  // Which token boundaries carry a drop-ring. Fall back to every boundary so a task that
  // omits gap_positions still renders (PunctuationPlace-style all-gaps behaviour).
  const candidateGaps = useMemo(() => {
    const explicit = task.options.punctuation?.gap_positions;
    if (explicit && explicit.length > 0) return new Set(explicit);
    return new Set(ex.tokens.map((_, i) => i));
  }, [task.options.punctuation?.gap_positions, ex.tokens]);

  // Live refs + measured window frames for each ring (the drop targets).
  const gapRefs = useRef<Record<number, View | null>>({});
  const framesRef = useRef<Record<number, Frame>>({});
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);
  // The comma is dragged vertically (up from the dispenser), the same axis as the
  // ScrollView — freeze scrolling mid-drag so the scroll view can't steal the pan.
  const [dragging, setDragging] = useState(false);

  const measureGaps = useCallback(() => {
    for (const [gap, node] of Object.entries(gapRefs.current)) {
      node?.measureInWindow((x, y, w, h) => {
        framesRef.current[Number(gap)] = { x, y, width: w, height: h };
      });
    }
  }, []);

  // Nearest ring centre to the finger, within DROP_RADIUS (else null).
  const gapAt = useCallback((px: number, py: number): number | null => {
    let best: number | null = null;
    let bestDist = DROP_RADIUS;
    for (const [gap, f] of Object.entries(framesRef.current)) {
      const cx = f.x + f.width / 2;
      const cy = f.y + f.height / 2;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = Number(gap);
      }
    }
    return best;
  }, []);

  const handleDragStart = useCallback(() => {
    measureGaps();
    setHoveredGap(null);
    setDragging(true);
  }, [measureGaps]);

  const handleDragMove = useCallback(
    (px: number, py: number) => {
      const gap = gapAt(px, py);
      setHoveredGap((prev) => (prev === gap ? prev : gap));
    },
    [gapAt]
  );

  const handleDrop = useCallback(
    (px: number, py: number) => {
      const gap = gapAt(px, py);
      if (gap !== null) ex.place(gap);
      setHoveredGap(null);
      setDragging(false);
    },
    [gapAt, ex]
  );

  const player = useAudioPlayer(task.prompt_audio_url ?? task.audio_url);
  const status = useAudioPlayerStatus(player);

  // Non-looping so the prompt ends and the buddy stops talking on its own.
  useEffect(() => {
    try {
      player.loop = false;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  const handlePlay = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.seekTo(0);
        player.play();
      }
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
      >
        {/* Naran + speech bubble; tapping either plays the prompt audio. */}
        <PressableScale
          style={styles.questionRow}
          onPress={handlePlay}
          accessibilityRole="button"
          accessibilityLabel="Сонсох"
        >
          <TalkingBuddy playing={status.playing} width={buddyWidth} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{BUBBLE_LABEL}</Text>
            <View style={styles.bubbleTail} />
            <View style={styles.speakerBadge}>
              <SpeakerButton playing={status.playing} onPress={handlePlay} size={40} />
            </View>
          </View>
        </PressableScale>

        {/* Sentence card: plain navy words wrap; at each candidate boundary sits a measurable
            ring that shows the placed comma (or fills while a comma hovers over it). */}
        <View style={styles.card}>
          <View style={styles.wordWrap}>
            {ex.tokens.map((token, i) => {
              const hasGap = candidateGaps.has(i);
              const placed = ex.isPlaced(i);
              const hovered = hoveredGap === i;
              return (
                <View key={`${token}-${i}`} style={styles.tokenUnit}>
                  <Text style={styles.wordText}>{token}</Text>
                  {hasGap ? (
                    <View
                      ref={(node) => {
                        gapRefs.current[i] = node;
                      }}
                      collapsable={false}
                      style={styles.gapSlot}
                    >
                      {placed ? (
                        <Animated.View key="mark" entering={ZoomIn.duration(200)}>
                          <Text style={styles.markText}>{ex.mark}</Text>
                        </Animated.View>
                      ) : (
                        <GapRing hovered={hovered} />
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Dispenser (infinite) + backspace tile once a comma has been placed. */}
        <View style={styles.dispenserRow}>
          <View style={styles.dispenserCard}>
            <DraggableMark
              mark={ex.mark}
              disabled={ex.isAnswered}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDrop={handleDrop}
            />
          </View>
          {ex.placed.length > 0 && !ex.isAnswered ? (
            <PressableScale
              onPress={ex.removeLast}
              style={styles.deleteTile}
              accessibilityRole="button"
              accessibilityLabel="Устгах"
            >
              <BackspaceIcon size={24} color={colors.textChoice} />
            </PressableScale>
          ) : null}
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <SubmitButton onPress={ex.submit} disabled={!ex.canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 26,
  },
  contentCompact: {
    gap: 16,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#E5F2FF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 96,
    justifyContent: 'center',
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 18,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.036,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    bottom: 22,
    width: 12,
    height: 12,
    backgroundColor: '#E5F2FF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  speakerBadge: {
    position: 'absolute',
    left: -14,
    top: -12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 12,
  },
  tokenUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    color: colors.textChoice,
    letterSpacing: -0.02,
  },
  // Sits between a word and the next; wide enough to seat the ring/comma and to be an
  // easy drop target without shoving the next word far away.
  gapSlot: {
    minWidth: RING,
    paddingHorizontal: 4,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 26,
    color: colors.textChoice,
    // seat the low-baseline comma on the word baseline
    marginBottom: -8,
  },
  dispenserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  dispenserCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    borderRadius: 46,
    padding: 27,
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  deleteTile: {
    width: 52,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
