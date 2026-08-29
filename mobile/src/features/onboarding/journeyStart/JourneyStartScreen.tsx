import { Image } from 'expo-image';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BubbleRight from '@/assets/onboarding/journey-start/bubble-right.svg';
import SparkleLeftArt from '@/assets/onboarding/journey-start/sparkle-left.svg';
import SparkleRightArt from '@/assets/onboarding/journey-start/sparkle-right.svg';
import Wordmark from '@/assets/onboarding/journey-start/wordmark.svg';

import type { CharacterArt } from '@/src/features/onboarding/characters';
import FigmaBoard from '@/src/features/onboarding/FigmaBoard';
import DurationPill from '@/src/features/onboarding/journeyStart/components/DurationPill';
import JourneySheet from '@/src/features/onboarding/journeyStart/components/JourneySheet';
import PrimaryPillButton from '@/src/features/onboarding/journeyStart/components/PrimaryPillButton';
import { GREENY, NARHAN, ORTO, PINKY } from '@/src/features/onboarding/journeyStart/characters';
import { DESIGN } from '@/src/features/onboarding/motion';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const bg = require('@/assets/onboarding/journey-start/bg.png');

/**
 * The journey-start page (Figma 204:11233, "first page") — runs last in the
 * `app/(onboarding)/[id]` sequence, after `ProfileSetupFlow` and before the
 * redirect back into the learner's first lesson. Same `{ onDone }` contract as
 * `OnboardingCarousel` / `ProfileSetupFlow`: a self-contained gate that reports when
 * its one CTA is tapped and knows nothing about where it's mounted.
 *
 * Unlike the rest of onboarding (which scales one rigid `DESIGN` board off both axes
 * via `boardScale`), this screen scales off width only and anchors independently at
 * top and bottom: the wordmark clears the safe area, and the card sits flush to the
 * bottom edge. A uniform both-axes scale (the `boardScale` approach) would shrink
 * everything — text included — by ~21% on an iPhone SE and leave empty gutters on
 * both sides; width-only scaling with edge anchoring fills the screen at any height.
 */

// Both marks are exported flat from Figma (`download_assets(nodeId, format: "svg")`)
// — the source path data is already in final page-space, so no hypot/rotate/skew/
// flip reconstruction is needed (or correct); `size` is the export's own intrinsic
// canvas, centred in the nominal Figma box, same convention as ORto's glow ellipses.
const SPARKLE_LEFT: CharacterArt = {
  size: { width: 13.193, height: 19.994 },
  leaves: [{ Art: SparkleLeftArt, box: { left: 0, top: 0, width: 13.193, height: 19.994 }, size: { width: 15, height: 22 } }],
};

const SPARKLE_RIGHT: CharacterArt = {
  size: { width: 25.46, height: 19.746 },
  leaves: [{ Art: SparkleRightArt, box: { left: 0, top: 0, width: 25.46, height: 19.746 }, size: { width: 27, height: 22 } }],
};

/** Page-absolute (left, top) of each mascot's board — widths/heights come from `art.size`. */
const ORTO_POS = { left: -4.208, top: 340.196 };
const PINKY_POS = { left: 105, top: 180.001 };
const GREENY_POS = { left: 9.734, top: 182.901 };
const NARHAN_POS = { left: 233, top: 328 };
const WORDMARK_BOX = { left: 213, top: 80, width: 144.059, height: 79.005 };
const BUBBLE_BOX = { left: 309, top: 183, width: 10, height: 10 };
const CARD_BOX = { left: 5, top: 479, width: 379, height: 360 };

// Both sparkles' Figma page coordinates fall inside CARD_BOX, so they're card
// decorations, not page ones — positioned card-locally (page coord minus the card's
// own origin) and rendered as JourneySheet children, painted after the card's opaque
// background rather than juggled into paint order at the page level.
const SPARKLE_LEFT_CARD_POS = { left: 54.193 - CARD_BOX.left, top: 515.725 - CARD_BOX.top };
const SPARKLE_RIGHT_CARD_POS = { left: 355.76 - CARD_BOX.left, top: 668.746 - CARD_BOX.top };

/** Never let the board grow past this — keeps a tablet from ballooning the art (app.json sets `supportsTablet: true`). */
const MAX_BOARD_WIDTH = 430;

/** Renders a `CharacterArt` at its natural size at an already-resolved screen position. */
function Mascot({
  art,
  left,
  top,
  scale,
}: {
  art: CharacterArt;
  left: number;
  top: number;
  scale: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.absolute, { left, top, width: art.size.width * scale, height: art.size.height * scale }]}
    >
      <View style={{ width: art.size.width, height: art.size.height, transform: [{ scale }] }}>
        <FigmaBoard size={art.size} leaves={art.leaves} />
      </View>
    </View>
  );
}

export default function JourneyStartScreen({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Width-driven scale, clamped so the board never grows past MAX_BOARD_WIDTH on a
  // wide/tablet screen.
  const s = Math.min(width, MAX_BOARD_WIDTH) / DESIGN.width;
  const boardLeft = (width - Math.min(width, MAX_BOARD_WIDTH)) / 2;

  // The card sits flush to the bottom edge (Figma: 844 - 479 - 360 = 5px from the
  // bottom), rather than at its old page-absolute `top`, so it never floats away from
  // the bottom on a short screen.
  const cardHeight = CARD_BOX.height * s;
  const cardTop = height - 5 * s - cardHeight;

  // The wordmark clears the safe area on a short/notched screen instead of sitting at
  // its fixed page `top`; the shift below carries the bubble along with it so their
  // relative spacing (as designed) is preserved.
  const wordmarkTop = Math.max(WORDMARK_BOX.top * s, insets.top + 20);
  const topShift = wordmarkTop - WORDMARK_BOX.top * s;

  // Mascots keep their designed spacing above the card by riding the same shift the
  // card itself picked up from its fixed Figma offset.
  const mascotShift = cardTop - CARD_BOX.top * s;

  return (
    <View style={styles.root}>
      <Image source={bg} style={StyleSheet.absoluteFill} contentFit="cover" />

      <Mascot art={ORTO} left={boardLeft + ORTO_POS.left * s} top={mascotShift + ORTO_POS.top * s} scale={s} />
      <Mascot art={GREENY} left={boardLeft + GREENY_POS.left * s} top={mascotShift + GREENY_POS.top * s} scale={s} />
      <Mascot art={PINKY} left={boardLeft + PINKY_POS.left * s} top={mascotShift + PINKY_POS.top * s} scale={s} />
      <Mascot art={NARHAN} left={boardLeft + NARHAN_POS.left * s} top={mascotShift + NARHAN_POS.top * s} scale={s} />

      <View
        pointerEvents="none"
        style={[
          styles.absolute,
          {
            left: boardLeft + WORDMARK_BOX.left * s,
            top: topShift + WORDMARK_BOX.top * s,
            width: WORDMARK_BOX.width * s,
            height: WORDMARK_BOX.height * s,
          },
        ]}
      >
        <Wordmark width="100%" height="100%" />
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.absolute,
          {
            left: boardLeft + BUBBLE_BOX.left * s,
            top: topShift + BUBBLE_BOX.top * s,
            width: BUBBLE_BOX.width * s,
            height: BUBBLE_BOX.height * s,
          },
        ]}
      >
        <BubbleRight width="100%" height="100%" />
      </View>

      <View style={[styles.absolute, { left: 0, right: 0, top: cardTop, alignItems: 'center' }]}>
        <JourneySheet scale={s}>
          {/* Figma centres both text blocks vertically within their own box
              (`justify-center` on a fixed-height flex column), not top-anchored —
              so each gets a sized wrapper View doing the centring, with the Text
              itself unpositioned. */}
          <View
            style={[
              styles.absolute,
              { left: 59 * s, top: 39 * s, width: 261 * s, height: 70 * s, justifyContent: 'center' },
            ]}
          >
            <Text style={[styles.title, { fontSize: 24 * s, lineHeight: 28.8 * s }]}>
              Зөв бичих аяллаа{'\n'}хаанаас эхлэх вэ?
            </Text>
          </View>
          <View
            style={[
              styles.absolute,
              { left: 37 * s, top: 102 * s, width: 320 * s, height: 66 * s, justifyContent: 'center' },
            ]}
          >
            <Text style={[styles.subtitle, { fontSize: 16 * s, lineHeight: 26 * s }]}>
              3 хөгжилтэй даалгавараар эхлэе!
            </Text>
          </View>
          <View style={[styles.absolute, { left: 53 * s, top: 186 * s }]}>
            <PrimaryPillButton label="Аяллаа эхлэх" onPress={onDone} scale={s} />
          </View>
          <View style={[styles.absolute, { left: 72 * s, top: 281 * s, width: 235 * s }]}>
            <DurationPill label="Ойролцоогоор 1-2 минут" scale={s} />
          </View>

          <Mascot art={SPARKLE_LEFT} left={SPARKLE_LEFT_CARD_POS.left * s} top={SPARKLE_LEFT_CARD_POS.top * s} scale={s} />
          <Mascot art={SPARKLE_RIGHT} left={SPARKLE_RIGHT_CARD_POS.left * s} top={SPARKLE_RIGHT_CARD_POS.top * s} scale={s} />
        </JourneySheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.onboardingGradientTop },
  absolute: { position: 'absolute' },
  title: {
    fontFamily: fonts.bold,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.048,
  },
  subtitle: {
    fontFamily: fonts.regular,
    color: colors.journeySubtitle,
    textAlign: 'center',
    letterSpacing: -0.32,
  },
});
