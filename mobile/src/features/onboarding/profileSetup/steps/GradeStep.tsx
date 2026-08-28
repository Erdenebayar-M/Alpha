import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { boardScale, DESIGN } from '@/src/features/onboarding/motion';
import AvatarBubble from '@/src/features/onboarding/profileSetup/components/AvatarBubble';
import ProfileStepLayout from '@/src/features/onboarding/profileSetup/components/ProfileStepLayout';
import { BOY_OPEN_EYES_STEADY, type Gender } from '@/src/features/onboarding/profileSetup/genderCharacters';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Step 3 (Figma `804-10366` idle / `825-10618` selected): pick a grade.
 *
 * Measured geometry (`get_metadata` on 804:10366): the character block occupies 194 of
 * vertical space, then a 10px gap, then four 216x39 pills spaced 10 apart.
 *
 * Like Personal Info, the boy is shown already awake (`BOY_OPEN_EYES_STEADY`) — he opened
 * his eyes on the Gender step and shouldn't shut them again on the way here.
 */

const GRADES = [1, 2, 3, 4];
/** Figma gives the 233-tall character cell only 194px of layout space here. */
const CHARACTER_BLOCK = 194;
const GAP = 10;
const PILL_HEIGHT = 39;

export default function GradeStep({
  gender,
  grade,
  onSelect,
  onContinue,
}: {
  gender: Gender;
  grade: number | null;
  onSelect: (grade: number) => void;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const scale = boardScale(DESIGN, width, height);

  return (
    <ProfileStepLayout ctaDisabled={grade === null} onContinue={onContinue}>
      <AvatarBubble
        gender={gender}
        scale={scale}
        blockHeight={CHARACTER_BLOCK}
        characterOverride={gender === 'boy' ? BOY_OPEN_EYES_STEADY : undefined}
      />

      <View style={{ width: '100%', gap: GAP * scale, marginTop: GAP * scale }}>
        {GRADES.map((value) => {
          const selected = grade === value;
          return (
            <PressableScale
              key={value}
              style={[
                styles.pill,
                { height: PILL_HEIGHT * scale, borderRadius: 25 * scale },
                selected && styles.pillSelected,
              ]}
              onPress={() => onSelect(value)}
              accessibilityRole="button"
              accessibilityLabel={`${value}-р анги`}
              accessibilityState={{ selected }}
            >
              <Text
                style={[styles.pillText, { fontSize: 14 * scale }, selected && styles.pillTextSelected]}
              >
                {value}-р анги
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </ProfileStepLayout>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: '100%',
    backgroundColor: colors.profileGradePillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: { backgroundColor: colors.profileGradePillSelectedBg },
  pillText: { fontFamily: fonts.sansRegular, color: colors.profileGradePillText },
  pillTextSelected: { fontFamily: fonts.sansBlack, color: colors.white },
});
