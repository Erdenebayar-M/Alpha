import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { CharacterArt } from '@/src/features/onboarding/characters';
import FigmaBoard from '@/src/features/onboarding/FigmaBoard';
import { useBreatheStyle } from '@/src/features/onboarding/idleLoops';
import { CHARACTERS, CIRCLE_LEFT, type Gender } from '@/src/features/onboarding/profileSetup/genderCharacters';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * The white circle backdrop + animated character, as Figma's "Эрэгтэй" cell
 * (`get_metadata` on 804:9229): a 216x233 box holding a 169px circle at (23|27, 0) and
 * the 216x209 character frame at (0, 24). The circle is a plain `borderRadius` fill —
 * exporting a solid circle as an asset would just be a longer way to draw one.
 *
 * `blockHeight` lets a step reserve less vertical space than the cell draws: Figma gives
 * this block 187px on the personal-info frame and 194px on the grade frame, so the
 * fields below sit tighter under the character than its full 233px would allow.
 *
 * `characterOverride`/`circleLeftOverride` swap in a different `CharacterArt` (e.g. the
 * Personal Info step showing the Slide 1 Yellow mascot — open eyes, unlike the flattened
 * "07_shy" `BOY` — in place of the gender's default character) without touching the
 * `CHARACTERS[gender]`/`CIRCLE_LEFT[gender]` lookups used everywhere else.
 *
 * `characterScale` shrinks the character *within* its slot (the circle and cell stay
 * put) independently of the board's own declared size. Slide 1's Yellow mascot and the
 * gender-select "07_shy" characters share almost the same board dimensions (~216-218px)
 * but not the same drawn density — Yellow is the Slide 1 centrepiece and fills ~85-96%
 * of its board, while "07_shy" is a small avatar icon filling ~46-56% of its own — so
 * reusing Yellow's board size at `characterScale={1}` renders it about 1.7x wider on
 * screen than "07_shy", overflowing the circle. Measured empirically (compare the boy's
 * rendered silhouette width against the girl's at a few trial values) rather than
 * derived from the source frames, since it's correcting for *drawn* density, not layout.
 */

const CELL = { width: 216, height: 233 };
const CIRCLE = 169;
const CHARACTER_TOP = 24;
/** Green "selected" badge — Figma's `Tint` at (172, 5) 25x24 inside the character frame. */
const CHECK = { left: 172, top: CHARACTER_TOP + 5, width: 25, height: 24 };
/** Both labels sit just under their character, within 3px of each other in Figma. */
const LABEL_TOP = 169;

export default function AvatarBubble({
  gender,
  selected = false,
  scale = 1,
  blockHeight = CELL.height,
  label,
  characterOverride,
  circleLeftOverride,
  characterScale = 1,
}: {
  gender: Gender;
  selected?: boolean;
  scale?: number;
  blockHeight?: number;
  label?: string;
  characterOverride?: CharacterArt;
  circleLeftOverride?: number;
  characterScale?: number;
}) {
  const art = characterOverride ?? CHARACTERS[gender];
  const circleLeft = circleLeftOverride ?? CIRCLE_LEFT[gender];
  // Held here, above the swapped-in board, so the loop keeps its phase when
  // `characterOverride` changes — see `useBreatheStyle`. Hooks can't be conditional, so
  // it always runs and is only *applied* by characters that ask for it.
  const breatheStyle = useBreatheStyle();
  // Centres a character whose board isn't the standard 216-wide "07_shy" frame — a no-op
  // for every character except an override with a differently sized board.
  const characterLeft = (CELL.width - art.size.width) / 2;

  return (
    <View style={{ width: CELL.width * scale, height: blockHeight * scale }}>
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            left: circleLeft * scale,
            width: CIRCLE * scale,
            height: CIRCLE * scale,
            borderRadius: (CIRCLE * scale) / 2,
          },
        ]}
      />

      {/* Centre-then-scale, as `ScaledBoard` does in slides/Slide1.tsx: RN scales about
          a view's own centre, so a natural-size board has to be centred in its scaled
          box or it drifts off by half the difference. */}
      <View
        pointerEvents="none"
        style={[
          styles.character,
          {
            left: characterLeft * scale,
            top: CHARACTER_TOP * scale,
            width: art.size.width * scale,
            height: art.size.height * scale,
          },
        ]}
      >
        <View
          style={{ width: art.size.width, height: art.size.height, transform: [{ scale: scale * characterScale }] }}
        >
          <Animated.View
            style={[
              { width: art.size.width, height: art.size.height },
              art.breathe ? breatheStyle : null,
            ]}
          >
            <FigmaBoard size={art.size} leaves={art.leaves} />
          </Animated.View>
        </View>
      </View>

      {label ? (
        <Text style={[styles.label, { top: LABEL_TOP * scale, fontSize: 14 * scale }]}>{label}</Text>
      ) : null}

      {selected ? (
        <View
          style={[
            styles.check,
            {
              left: CHECK.left * scale,
              top: CHECK.top * scale,
              width: CHECK.width * scale,
              height: CHECK.height * scale,
              borderRadius: (CHECK.height * scale) / 2,
            },
          ]}
        >
          <Text style={[styles.checkGlyph, { fontSize: 13 * scale }]}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', top: 0, backgroundColor: colors.white },
  character: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    color: colors.textNavy,
  },
  check: {
    position: 'absolute',
    backgroundColor: colors.profileSelectedCheckBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: { color: colors.white, fontWeight: '700' },
});
