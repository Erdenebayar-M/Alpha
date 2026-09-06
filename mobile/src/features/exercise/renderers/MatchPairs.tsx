import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, UIManager, useWindowDimensions, View } from 'react-native';

import DraggableImageCard from '@/src/features/exercise/components/DraggableImageCard';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import PuzzleCard from '@/src/features/exercise/components/PuzzleCard';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useMatchExercise } from '@/src/features/exercise/hooks/useMatchExercise';
import { useAudioFinishedLatch, useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { fonts } from '@/src/theme/typography';

// Progress-driven encouragement in the speech bubble (from the Figma states).
const COPY = {
  intro: 'Тохирох үгийг холбоорой!',
  first: 'Еэээе, эхний үг холбогдлоо',
  last: 'Сайн байна. Сүүлийн үг.',
  done: 'Баяр хүргэе! Амжилттай холболоо.',
} as const;

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Android needs LayoutAnimation explicitly enabled for the reflow to animate.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Connect-two-columns matching task ("Тохирох үгийг холбоорой!"): the child drags a
 * picture card onto a word card to link them; a valid drop snaps the pieces together
 * with an interlocking puzzle joint and the image reflows onto its word's row. Khishigee
 * reads the prompt and cheers as pairs connect. Reuses the FillBlank character motion.
 */
export default function MatchPairs({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Sits beside the bubble at a comparable height (Figma). ASPECT mirrors SproutAvatar.
  const avatarWidth = Math.max(84, Math.min(width * 0.24, height * 0.14, 116));
  // Bubble text scales down a touch on narrow phones (SE) so it never overflows.
  const bubbleFont = Math.round(Math.min(22, width * 0.058));

  // Unconnected pairs sit apart (so they read as not-yet-linked); once locked,
  // the row's gap collapses to 0 so the knob/socket overlap into one
  // interlocking joint at the seam. Cap card width at the Figma's 160px, sized
  // against the wider (unlocked) gap so the row never overflows either way.
  const GAP_UNLOCKED = spacing.md;
  const cardW = Math.min(160, Math.floor((width - 32 - GAP_UNLOCKED) / 2));
  const cardH = Math.round(cardW * (110 / 160));

  const lockMode = task.options.match_lock_mode ?? 'any';
  const ex = useMatchExercise(task, onResult, { lockMode });

  // Word-card drop targets: keep a live ref to each and their measured window frames.
  const wordRefs = useRef<Record<string, View | null>>({});
  const framesRef = useRef<Record<string, Frame>>({});
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [draggingLeftId, setDraggingLeftId] = useState<string | null>(null);

  const measureTargets = useCallback(() => {
    for (const [id, node] of Object.entries(wordRefs.current)) {
      node?.measureInWindow((x, y, w, h) => {
        framesRef.current[id] = { x, y, width: w, height: h };
      });
    }
  }, []);

  const rowAt = useCallback((px: number, py: number): string | null => {
    for (const [id, f] of Object.entries(framesRef.current)) {
      if (px >= f.x && px <= f.x + f.width && py >= f.y && py <= f.y + f.height) return id;
    }
    return null;
  }, []);

  const handleDragStart = useCallback(
    (leftId: string) => {
      measureTargets();
      setDraggingLeftId(leftId);
    },
    [measureTargets]
  );

  const handleDragMove = useCallback(
    (px: number, py: number) => {
      const id = rowAt(px, py);
      setHoveredRowId((prev) => (prev === id ? prev : id));
    },
    [rowAt]
  );

  const handleDrop = useCallback(
    (leftId: string, px: number, py: number) => {
      const id = rowAt(px, py);
      if (id) ex.attemptLink(leftId, id);
      setHoveredRowId(null);
      setDraggingLeftId(null);
    },
    [rowAt, ex]
  );

  const audioUrl = task.prompt_audio_url ?? task.audio_url;
  const { player, status, toggle: handlePlay } = useTaskAudio(audioUrl, {
    loop: false,
    replayFromStart: true,
  });

  // Audio-first (AGENTS §5): when the task carries a prompt, auto-play it once on load
  // so Khishigee reads it aloud and visibly transitions idle → playing → done.
  const autoplayed = useRef(false);
  useEffect(() => {
    if (autoplayed.current) return;
    if (task.options.audio_trigger && audioUrl) {
      autoplayed.current = true;
      try {
        player.play();
      } catch {
        // ignore playback errors (e.g. an unreachable mock URL)
      }
    }
  }, [player, task.options.audio_trigger, audioUrl]);

  const hasFinished = useAudioFinishedLatch(status);

  // Gentle reflow whenever the set of links changes.
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [ex.linkedCount]);

  // Character celebrates once everything is linked; otherwise tracks the audio.
  const complete = ex.linkedCount === ex.totalPairs && ex.totalPairs > 0;
  const sproutState: SproutState = complete
    ? 'done'
    : status.playing
      ? 'playing'
      : hasFinished
        ? 'done'
        : 'idle';

  const bubbleText = useMemo(() => {
    if (complete) return COPY.done;
    if (ex.linkedCount === 0) return COPY.intro;
    if (ex.linkedCount === ex.totalPairs - 1) return COPY.last;
    return COPY.first;
  }, [complete, ex.linkedCount, ex.totalPairs]);

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 16 })}
        showsVerticalScrollIndicator={false}
      >
        {/* Large centered bubble (left) with Khishigee overlapping its right edge and
            her hear-button tucked at the seam (Figma layout). */}
        <View style={styles.headerRow}>
          <View style={styles.bubble}>
            <Text style={[styles.bubbleText, { fontSize: bubbleFont, lineHeight: Math.round(bubbleFont * 1.2) }]}>
              {bubbleText}
            </Text>
            <View style={styles.bubbleTail} />
          </View>
          <View style={styles.charCluster}>
            <SproutAvatar state={sproutState} width={avatarWidth} />
            <View style={styles.speakerWrap}>
              <SpeakerButton playing={status.playing} onPress={handlePlay} size={44} />
            </View>
          </View>
        </View>

        {/* The two columns, one row per pair. Drag a picture (left) onto a word (right). */}
        <View style={styles.board}>
          {ex.rows.map((row) => {
            const rowActive = row.left != null && row.left.id === draggingLeftId;
            // The forced last pair: auto-filled and pinned so it stays (no drag, no unlink).
            const isAuto = ex.autoLinkedRightId === row.right.id && row.locked;
            return (
              <View
                key={row.right.id}
                style={[styles.row, { gap: row.locked ? 0 : GAP_UNLOCKED, zIndex: rowActive ? 30 : 1 }]}
              >
                {row.left ? (
                  <DraggableImageCard
                    leftId={row.left.id}
                    width={cardW}
                    height={cardH}
                    imageUrl={row.left.imageUrl}
                    disabled={ex.isAnswered || isAuto}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDrop={handleDrop}
                  />
                ) : (
                  <View style={{ width: cardW, height: cardH }} />
                )}
                <View
                  ref={(node) => {
                    wordRefs.current[row.right.id] = node;
                  }}
                  collapsable={false}
                >
                  <PuzzleCard
                    variant="word"
                    width={cardW}
                    height={cardH}
                    text={row.right.text}
                    locked={row.locked}
                    hovered={hoveredRowId === row.right.id}
                    rejected={ex.rejectedRightId === row.right.id}
                    onPress={row.locked && !isAuto ? () => ex.unlinkRight(row.right.id) : undefined}
                    disabled={ex.isAnswered}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <SubmitButton onPress={ex.submit} disabled={!ex.canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '64%',
    backgroundColor: colors.bubbleFill,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bubbleText: {
    fontFamily: fonts.black,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.044,
  },
  bubbleTail: {
    position: 'absolute',
    right: -5,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.bubbleFill,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  charCluster: {
    // pinned to the right end of the row; the bubble takes the left.
    marginLeft: 'auto',
    position: 'relative',
  },
  speakerWrap: {
    // tucked at the character's upper-left, bridging toward the bubble's right edge.
    position: 'absolute',
    left: -22,
    top: '14%',
  },
  board: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
