import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import PressableScale from '@/src/components/PressableScale';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import TalkingCharacter from '@/src/features/exercise/components/TalkingCharacter';
import { VOLUME_HIGH_SVG } from '@/src/features/exercise/components/volumeIcons';
import { LISTEN_LABEL } from '@/src/features/exercise/copy';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface BuddyVariantProps {
  variant: 'buddy';
  label: string;
  playing: boolean;
  onPress: () => void;
  width: number;
}

interface SproutVariantProps {
  variant: 'sprout';
  label: string;
  sproutState: SproutState;
  onPress: () => void;
  width: number;
}

/**
 * A character + speech-bubble row that plays the prompt audio on tap — the header
 * every renderer with a talking character opens with. Two variants, each byte-for-byte
 * what 4 (`buddy`: CommaPlace, PunctuationPlace, SentenceCapital, SentencePunctuation)
 * and 2 (`sprout`: FillBlank, FillLetterTiles) renderers hand-rolled identically:
 * `buddy` is Naran with a floating SpeakerButton badge and a bottom-anchored bubble
 * tail; `sprout` is Khishigee with the speaker as an inline icon inside the bubble and
 * a vertically-centred tail. Different enough in layout that unifying them further
 * (one shared bubble shape) would mean forcing one to imitate the other's design —
 * this keeps each variant's exact original markup, switched on `variant`.
 */
export default function BuddyPrompt(props: BuddyVariantProps | SproutVariantProps) {
  if (props.variant === 'sprout') {
    const { label, sproutState, onPress, width } = props;
    return (
      <PressableScale
        style={styles.characterRow}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={LISTEN_LABEL}
      >
        <SproutAvatar state={sproutState} width={width} />
        <View style={styles.sproutBubble}>
          <SvgXml xml={VOLUME_HIGH_SVG.replace('__C__', colors.primaryBlue)} width={16} height={16} />
          <Text style={styles.sproutBubbleText}>{label}</Text>
          <View style={styles.sproutBubbleTail} />
        </View>
      </PressableScale>
    );
  }

  const { label, playing, onPress, width } = props;
  return (
    <PressableScale
      style={styles.questionRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={LISTEN_LABEL}
    >
      <TalkingCharacter character="buddy" playing={playing} width={width} />
      <View style={styles.buddyBubble}>
        <Text style={styles.buddyBubbleText}>{label}</Text>
        <View style={styles.buddyBubbleTail} />
        <View style={styles.speakerBadge}>
          <SpeakerButton playing={playing} onPress={onPress} size={40} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // buddy variant
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  buddyBubble: {
    flex: 1,
    backgroundColor: colors.bubbleFill,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 96,
    justifyContent: 'center',
  },
  buddyBubbleText: {
    fontFamily: fonts.black,
    fontSize: 18,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.036,
  },
  buddyBubbleTail: {
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
  // sprout variant
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sproutBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bubbleFill,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sproutBubbleText: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    letterSpacing: -0.032,
  },
  sproutBubbleTail: {
    position: 'absolute',
    left: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.bubbleFill,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
