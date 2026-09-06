import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import TalkingCharacter, { CHARACTER_ASPECT } from '@/src/features/exercise/components/TalkingCharacter';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const hand = require('@/assets/characters/sprout-talk/hand.png');

// Measured from a 1:1 render of Figma 444:5669 (390x844) and from the sprite PNGs — not
// eyeballed. See LetterChoice's plan notes if these ever need re-deriving.
const CARD_OF_WIDTH = 0.359; // card 140 / screen 390
const CARD_MAX = 140;
const SPROUT_OF_CARD = 0.55; // body.png's cone renders 44pt wide at card=140 with this ratio
const SPROUT_VISIBLE = 0.648; // clip fraction -> 64pt of visible green at card=140

// hand.png is 73x110 with its ink at x 21..63, y 0..90 — the ink is NOT centred in the
// canvas (centre 0.5753 across, not 0.5). These fractions position the *ink*, not the box,
// so the two hooked arms land symmetrically on the cone regardless of card size.
const HAND_BOX_OF_CARD = 0.124; // box width -> 10pt of visible ink at card=140
const HAND_ASPECT = 110 / 73; // native aspect, so `contain` never letterboxes
const HAND_INK_CX = (21 + 63) / 2 / 73; // 0.5753
const HAND_SPREAD_OF_CARD = 0.1607; // ink centre at card centre +/- 22.5pt at card=140
const HAND_TOP_OF_CARD = -0.05; // ink top 7pt above the card's edge at card=140

/**
 * "First letter" multiple choice ("Эхний үсэг аль нь вэ?"): a picture is shown and
 * the child picks the letter it starts with. Khishigee reads the prompt aloud when
 * the speaker button is tapped and "talks" while the audio plays.
 */
export default function LetterChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const cardSize = Math.max(128, Math.min(width * CARD_OF_WIDTH, height * 0.2, CARD_MAX));
  // The sprout is a small character perched on top of the card — in the Figma its body
  // (the cone, not the sprite's full canvas) is 44pt wide against a 140pt card. Tie its
  // size to the card so the proportion stays correct on every screen.
  const sproutWidth = Math.round(cardSize * SPROUT_OF_CARD);

  // Khishigee's two little arms hook down over the card's top edge, straddling it (mostly
  // above, some below). Sized and centred on the card's centre line so both arms mirror by
  // construction — see HAND_* constants above for why the left/right offsets differ.
  const handW = cardSize * HAND_BOX_OF_CARD;
  const handH = handW * HAND_ASPECT;
  const handTop = cardSize * HAND_TOP_OF_CARD;
  const handSpread = cardSize * HAND_SPREAD_OF_CARD;
  // The right hand is un-mirrored: its ink sits HAND_INK_CX across the box.
  const rightHandLeft = cardSize / 2 + handSpread - handW * HAND_INK_CX;
  // The left hand is mirrored (scaleX: -1), so its ink sits (1 - HAND_INK_CX) across the box.
  const leftHandLeft = cardSize / 2 - handSpread - handW * (1 - HAND_INK_CX);
  // The hands mount in `cluster`, not `card` (see styles.cluster/styles.hand), so `handTop`
  // — measured relative to the card's own top edge — needs to be re-based to the cluster's
  // top edge, which starts one sproutRow + its 1pt margin higher. Mirrors TalkingCharacter's
  // own `height * visibleFraction` so this stays exact without duplicating that logic.
  const sproutHeight = (sproutWidth / CHARACTER_ASPECT.sprout) * SPROUT_VISIBLE;
  const clusterHandTop = sproutHeight + 1 + handTop;

  const ex = useChoiceExercise(task, onResult);

  const { status, toggle: handlePlay } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 16, align: 'center', justify: 'center' })}
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt in a speech bubble whose tail points down toward the character. */}
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{task.prompt_text}</Text>
          <View style={styles.bubbleTail} />
        </View>

        {/* Character sits centered directly above the picture card, with the speaker
            button floating to its right (Figma: sprout over the card, arms hooking the
            top edge). The cluster is the card's width so everything centers over it.
            The two hands are cluster-level siblings of sproutRow/card (not children of
            card) so their zIndex can lift them above BOTH — matching Figma's own layer
            order, where the arms sit in front of the whole illustration. Nesting them
            inside card previously trapped them one stacking level below the sprout, so
            the cone painted over the arm's shoulder-connecting stroke. */}
        <View style={styles.stage}>
          <View style={[styles.cluster, { width: cardSize }]}>
            <View style={[styles.sproutRow, { width: cardSize }]}>
              <TalkingCharacter character="sprout" playing={status.playing} width={sproutWidth} visibleFraction={SPROUT_VISIBLE} />
              <View style={styles.speakerWrap}>
                <SpeakerButton playing={status.playing} onPress={handlePlay} />
              </View>
            </View>

            <View style={[styles.card, { width: cardSize, height: cardSize, borderRadius: cardSize * 0.22 }]}>
              {task.image_url ? (
                <Image source={{ uri: task.image_url }} style={styles.image} contentFit="contain" transition={200} />
              ) : null}
            </View>

            <Image
              source={hand}
              style={[
                styles.hand,
                { width: handW, height: handH, top: clusterHandTop, left: leftHandLeft, transform: [{ scaleX: -1 }] },
              ]}
              contentFit="contain"
            />
            <Image
              source={hand}
              style={[styles.hand, { width: handW, height: handH, top: clusterHandTop, left: rightHandLeft }]}
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
  choicesWrap: {
    // content sets alignItems:'center', so stretch the choice sheet back to full width.
    alignSelf: 'stretch',
  },
  bubble: {
    alignSelf: 'stretch',
    backgroundColor: colors.bubbleFill,
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
    backgroundColor: colors.bubbleFill,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  stage: {
    alignItems: 'center',
  },
  cluster: {
    // Shared stacking context for sproutRow, card, and the two hands, so the hands'
    // zIndex can put them above BOTH (see the JSX comment above) instead of being
    // trapped one level below sproutRow while nested inside card.
    position: 'relative',
  },
  sproutRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    // The body sits fully ABOVE the card (never behind it); only the arms reach down to
    // bridge onto the card's top edge. Matches the Figma (1pt gap).
    marginBottom: 1,
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
    zIndex: 3,
  },
});
