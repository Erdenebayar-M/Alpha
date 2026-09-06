// Reachable only via an explicit task.interaction_form: 'punctuation_place'
// override (see resolveInteractionForm in taskTypeMap.ts). No task_type maps
// here by default: shared/src/validators/task.ts's TASK_TYPE_OPTION_SHAPE has
// no punctuation options shape for any of the 43 codes yet, so no real backend
// payload can select this renderer until one is added.
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import PressableScale from '@/src/components/PressableScale';
import { BackspaceIcon } from '@/src/features/exercise/components/icons';
import DraggableMark from '@/src/features/exercise/components/DraggableMark';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import TalkingBuddy from '@/src/features/exercise/components/TalkingBuddy';
import { LISTEN_LABEL } from '@/src/features/exercise/copy';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { usePunctuationExercise } from '@/src/features/exercise/hooks/usePunctuationExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

// The buddy asks the same thing on every place-the-mark task; the sentence tokens
// and the correct gaps live in options.punctuation (see PunctuationOptions).
const BUBBLE_LABEL = 'Өгүүлбэрийн төгсгөлийг олж, тэмдгийг тавиарай';

// A dropped mark counts for the nearest gap only if the finger lands within this
// screen distance of the gap centre — keeps a drop onto empty space a no-op.
const DROP_RADIUS = 120;

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * "Place the mark at the end of the sentence" task ("Өгүүлбэрийн төгсгөлд тэмдэг
 * тавих"): the sentence is laid out as pink word chips; the child drags a punctuation
 * mark (usually ".") from the dispenser into the gap after the word that ends a
 * sentence. An orange caret previews the targeted gap; a dropped mark appears inline;
 * the backspace tile removes the last one. Naran reads the prompt aloud. Several marks
 * can be placed for multi-sentence prompts — the dispenser is an infinite source.
 */
export default function PunctuationPlace({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const buddyWidth = Math.max(84, Math.min(width * 0.24, 108));
  const compact = height < 720;

  const ex = usePunctuationExercise(task, onResult);

  // Live refs + measured window frames for each gap (the drop targets).
  const gapRefs = useRef<Record<number, View | null>>({});
  const framesRef = useRef<Record<number, Frame>>({});
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);
  // The mark is dragged vertically (up from the dispenser), the same axis as the
  // ScrollView — freeze scrolling mid-drag so the scroll view can't steal the pan.
  const [dragging, setDragging] = useState(false);

  const measureGaps = useCallback(() => {
    for (const [gap, node] of Object.entries(gapRefs.current)) {
      node?.measureInWindow((x, y, w, h) => {
        framesRef.current[Number(gap)] = { x, y, width: w, height: h };
      });
    }
  }, []);

  // Nearest gap centre to the finger, within DROP_RADIUS (else null).
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

  const { status, toggle: handlePlay } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: compact ? 16 : 26, justify: 'center' })}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
      >
        {/* Naran + speech bubble; tapping either plays the prompt audio. */}
        <PressableScale
          style={styles.questionRow}
          onPress={handlePlay}
          accessibilityRole="button"
          accessibilityLabel={LISTEN_LABEL}
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

        {/* Sentence card: word chips wrap, each followed by a measurable gap slot that
            shows the placed mark (or the orange caret while a mark hovers over it). */}
        <View style={styles.card}>
          <View style={styles.wordWrap}>
            {ex.tokens.map((token, i) => {
              const placed = ex.isPlaced(i);
              const hovered = hoveredGap === i;
              return (
                <View key={`${token}-${i}`} style={styles.tokenUnit}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{token}</Text>
                  </View>
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
                    ) : hovered ? (
                      <View style={styles.caret} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Dispenser (infinite) + backspace tile once a mark has been placed. */}
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
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.bubbleFill,
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
    backgroundColor: colors.bubbleFill,
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
    ...shadows.card,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // Spread each row of chips across the full card width instead of clumping them
    // left — fills the card and widens the drop-gaps between words.
    justifyContent: 'space-between',
    rowGap: 16,
  },
  tokenUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: colors.pastelBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    color: colors.textChoice,
    letterSpacing: -0.02,
  },
  // Sits between a chip and the next word; wide enough to be an easy drop target
  // and to seat the mark/caret without shoving the next chip far away.
  gapSlot: {
    minWidth: 10,
    paddingHorizontal: 3,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  markText: {
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 26,
    color: colors.textChoice,
  },
  caret: {
    width: 3,
    height: 26,
    borderRadius: 2,
    backgroundColor: colors.dropCaret,
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
    ...shadows.sheet(3),
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
    ...shadows.sheetSmall,
  },
});
