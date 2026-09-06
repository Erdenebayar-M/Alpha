// Reachable only via an explicit task.interaction_form: 'syllable_assemble_word'
// override (see resolveInteractionForm in taskTypeMap.ts) — no task_type maps
// here by default, since TT_1_4/TT_2_2 already default to
// assemble_word/audio_assemble_word for the same assembleWordOptions shape.
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import CheckAnswerBox from '@/src/features/exercise/components/CheckAnswerBox';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import MergedWordPill from '@/src/features/exercise/components/MergedWordPill';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import SyllablePool from '@/src/features/exercise/components/SyllablePool';
import WordSlots from '@/src/features/exercise/components/WordSlots';
import { LISTEN_LABEL } from '@/src/features/exercise/copy';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useAssembleWord } from '@/src/features/exercise/hooks/useAssembleWord';
import { useAudioFinishedLatch, useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const PROMPT_FALLBACK = 'Үеэр үг бүтээгээрэй.';
// A dropped syllable counts for the nearest slot only if the finger lands within this
// screen distance of the slot centre (slots are 76x54) — mirrors PunctuationPlace's
// DROP_RADIUS pattern for its punctuation-mark gaps.
const DROP_RADIUS = 90;

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Drag-the-syllables assemble-word task (Figma "Үеэр үг бүтээх"): the child drags
 * syllable chips from a tray into dashed answer slots. The checkbox is a merge/
 * un-merge *preview* toggle, not a grade — checking it collapses the two slots into
 * one word pill (right or wrong, no signal either way); unchecking splits them back
 * apart with the same tiles still placed, so a wrong syllable can be cleared and
 * redone. Only the arrow button — tappable once merged — actually grades and advances,
 * exactly one attempt per task like every other renderer. Positional drag placement
 * (placeAt) and the non-repacking clearSlot are opt-in additions to useAssembleWord;
 * AssembleWord/AudioAssembleWord's tap-to-place, auto-advancing behavior is untouched.
 */
export default function SyllableAssembleWord({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(72, Math.min(width * 0.22, height * 0.12, 96));

  // Purely a display toggle over ex.slots, which merging never mutates — unmerging
  // always reveals exactly what was there before, tiles intact.
  const [merged, setMerged] = useState(false);
  const ex = useAssembleWord(task, onResult, { repackOnClear: false });

  const { status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });
  const hasFinished = useAudioFinishedLatch(status);
  const sproutState: SproutState = hasFinished ? 'done' : status.playing ? 'playing' : 'idle';

  // Live refs + measured window frames for each slot (the drop targets).
  const slotRefs = useRef<Record<number, View | null>>({});
  const framesRef = useRef<Record<number, Frame>>({});
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const measureSlots = useCallback(() => {
    for (const [slot, node] of Object.entries(slotRefs.current)) {
      node?.measureInWindow((x, y, w, h) => {
        framesRef.current[Number(slot)] = { x, y, width: w, height: h };
      });
    }
  }, []);

  const slotAt = useCallback((px: number, py: number): number | null => {
    let best: number | null = null;
    let bestDist = DROP_RADIUS;
    for (const [slot, f] of Object.entries(framesRef.current)) {
      const cx = f.x + f.width / 2;
      const cy = f.y + f.height / 2;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = Number(slot);
      }
    }
    return best;
  }, []);

  const handleDragStart = useCallback(() => {
    measureSlots();
    setHoveredSlot(null);
    setDragging(true);
  }, [measureSlots]);

  const handleDragMove = useCallback(
    (px: number, py: number) => {
      const slot = slotAt(px, py);
      setHoveredSlot((prev) => (prev === slot ? prev : slot));
    },
    [slotAt]
  );

  const handleDrop = useCallback(
    (tileIndex: number, px: number, py: number) => {
      const slot = slotAt(px, py);
      if (slot !== null) ex.placeAt(slot, tileIndex);
      setHoveredSlot(null);
      setDragging(false);
    },
    [slotAt, ex]
  );

  const promptText = task.prompt_text?.trim() ? task.prompt_text : PROMPT_FALLBACK;
  const slotLetters = useMemo(
    () => ex.slots.map((tileIndex) => (tileIndex === null ? null : ex.tiles[tileIndex])),
    [ex.slots, ex.tiles]
  );
  const mergedWord = useMemo(() => slotLetters.join(''), [slotLetters]);
  const anySlotFilled = ex.slots.some((s) => s !== null);
  const allSlotsFilled = ex.slots.every((s) => s !== null);

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 20, align: 'center' })}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
      >
        <PressableScale
          style={styles.header}
          onPress={handleToggleAudio}
          accessibilityRole="button"
          accessibilityLabel={LISTEN_LABEL}
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{promptText}</Text>
          </View>
          <View style={styles.characterCluster}>
            <SpeakerButton playing={status.playing} onPress={handleToggleAudio} size={44} />
            <SproutAvatar state={sproutState} width={avatarWidth} />
          </View>
        </PressableScale>

        {task.image_url ? (
          <View style={styles.imageCard}>
            <Image source={task.image_url} style={styles.image} contentFit="cover" />
          </View>
        ) : null}

        <View style={styles.answerArea}>
          {merged ? (
            <MergedWordPill word={mergedWord} />
          ) : (
            <View style={styles.answerRow}>
              <WordSlots
                letters={slotLetters}
                onClearSlot={ex.clearSlot}
                isAnswered={ex.isAnswered}
                slotWidth={76}
                slotHeight={54}
                slotRef={(index, node) => {
                  slotRefs.current[index] = node;
                }}
                hoveredIndex={hoveredSlot}
                transparentWhenEmpty
              />
              {anySlotFilled ? (
                <CheckAnswerBox
                  checked={merged}
                  disabled={!allSlotsFilled || ex.isAnswered}
                  onPress={() => setMerged((prev) => !prev)}
                />
              ) : null}
            </View>
          )}

          <SyllablePool
            tiles={ex.tiles}
            usedTiles={ex.usedTiles}
            isAnswered={merged || ex.isAnswered}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDrop={handleDrop}
          />
        </View>

        <FeedbackText>{ex.isAnswered ? ex.feedback : null}</FeedbackText>
      </ScrollView>

      <SubmitButton onPress={ex.submit} disabled={!merged || ex.isAnswered} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.bubbleFill,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 19,
    lineHeight: 24,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.038,
  },
  characterCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  imageCard: {
    width: 140,
    height: 140,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: '#A8BDE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  answerArea: {
    alignSelf: 'stretch',
    gap: 10,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
