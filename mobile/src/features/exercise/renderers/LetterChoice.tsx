import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import TalkingSprout from '@/src/features/exercise/components/TalkingSprout';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const hand = require('@/assets/characters/sprout-talk/hand.png');

/**
 * "First letter" multiple choice ("Эхний үсэг аль нь вэ?"): a picture is shown and
 * the child picks the letter it starts with. Khishigee reads the prompt aloud when
 * the speaker button is tapped and "talks" while the audio plays.
 */
export default function LetterChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const cardSize = Math.max(128, Math.min(width * 0.4, height * 0.2, 150));
  // The sprout is a small character perched on top of the card — in the Figma its body
  // is ~0.34 of the card's width and it sits right at the card's top edge. Tie its size
  // to the card so the proportion stays correct on every screen.
  const sproutWidth = Math.round(cardSize * 0.38);
  // The sprite is a full-body character but the design crops it to just the top portion
  // (head-to-chest, above the landscape belly) so it "peeks" over the card. Show the top
  // ~64% and clip the rest. See TalkingSprout `visibleFraction`.
  const SPROUT_VISIBLE = 0.64;
  // Arm-hooks: ~13% of the card wide, hooking down over its top edge from the body's
  // lower corners (~39% and ~65% across, measured from the Figma).
  const handW = cardSize * 0.13;
  const handH = handW * 1.4;

  const ex = useChoiceExercise(task, onResult);

  const { status, toggle: handlePlay } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt in a speech bubble whose tail points down toward the character. */}
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{task.prompt_text}</Text>
          <View style={styles.bubbleTail} />
        </View>

        {/* Character sits centered directly above the picture card, with the speaker
            button floating to its right (Figma: sprout over the card, arms hooking the
            top edge). The sprout row is the card's width so the sprout centers over it. */}
        <View style={styles.stage}>
          <View style={[styles.sproutRow, { width: cardSize }]}>
            <TalkingSprout playing={status.playing} width={sproutWidth} visibleFraction={SPROUT_VISIBLE} />
            <View style={styles.speakerWrap}>
              <SpeakerButton playing={status.playing} onPress={handlePlay} />
            </View>
          </View>

          <View style={[styles.card, { width: cardSize, height: cardSize, borderRadius: cardSize * 0.22 }]}>
            {task.image_url ? (
              <Image source={{ uri: task.image_url }} style={styles.image} contentFit="contain" transition={200} />
            ) : null}
            {/* Khishigee's two little arms hook down over the card's top edge from the
                body's lower corners (~39% and ~65% across), the left one mirrored. They
                straddle the top edge (mostly above it), so they connect the sprout to the card. */}
            <Image
              source={hand}
              style={[
                styles.hand,
                { width: handW, height: handH, top: -handH * 0.7, left: '39%', marginLeft: -handW / 2, transform: [{ scaleX: -1 }] },
              ]}
              contentFit="contain"
            />
            <Image
              source={hand}
              style={[styles.hand, { width: handW, height: handH, top: -handH * 0.7, left: '65%', marginLeft: -handW / 2 }]}
              contentFit="contain"
            />
          </View>
        </View>

        {/* The selection belongs with the content block (bubble → sprout → image →
            choices), not glued to the submit button — so it lives inside the scroll. */}
        <View style={styles.choicesWrap}>
          <ChoiceGrid
            choices={ex.choices}
            selectedIndex={ex.selectedIndex}
            isAnswered={ex.isAnswered}
            onSelect={ex.select}
            singleRow
          />
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      {/* Only the "next page" arrow is pinned at the bottom, alone. */}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 16,
  },
  choicesWrap: {
    // content sets alignItems:'center', so stretch the choice sheet back to full width.
    alignSelf: 'stretch',
  },
  bubble: {
    alignSelf: 'stretch',
    backgroundColor: '#E5F2FF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 18,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.036,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -5,
    left: '58%',
    width: 12,
    height: 12,
    backgroundColor: '#E5F2FF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  stage: {
    alignItems: 'center',
  },
  sproutRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    // Small positive gap: the body sits fully ABOVE the card (never behind it); only the
    // arms reach down to bridge onto the card's top edge. Matches the Figma (~3px gap).
    marginBottom: 4,
    zIndex: 2,
  },
  speakerWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 1, // keep the card below the sprout so the sprout is never painted over
    shadowColor: '#A8BDE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  image: {
    width: '82%',
    height: '82%',
  },
  hand: {
    position: 'absolute',
    top: -6,
    zIndex: 3,
  },
});
