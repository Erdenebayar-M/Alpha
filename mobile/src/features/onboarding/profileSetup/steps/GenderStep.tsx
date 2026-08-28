import { StyleSheet, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { EyeOpenProvider } from '@/src/features/onboarding/idleLoops';
import { boardScale, DESIGN } from '@/src/features/onboarding/motion';
import AvatarBubble from '@/src/features/onboarding/profileSetup/components/AvatarBubble';
import ProfileStepLayout from '@/src/features/onboarding/profileSetup/components/ProfileStepLayout';
import { BOY_EYES_DRIVEN, type Gender } from '@/src/features/onboarding/profileSetup/genderCharacters';

/**
 * Step 1 (Figma `804-8990` idle / `804-9634` selected): pick a gender.
 *
 * Figma stacks the two 216x233 cells with no gap at all (their parent, 804:9166, is
 * exactly 216x466) — the separation you see comes from each cell's own trailing space.
 *
 * The boy's eyes open when he's picked and shut again when the pick moves to the girl,
 * alongside the green checkmark. He is rendered as `BOY_EYES_DRIVEN` throughout — the
 * art never changes, only the `EyeOpenProvider` driver does, so both directions animate
 * and neither pays for mounting a new character (see `genderCharacters.tsx`).
 *
 * This is the *only* step that plays the opening; Personal Info and Grade use
 * `BOY_OPEN_EYES_STEADY`, so he stays open-eyed for the rest of the flow without
 * replaying it. The girl needs no equivalent — her eyes are already open by design.
 */
export default function GenderStep({
  gender,
  onSelect,
  onContinue,
}: {
  gender: Gender | null;
  onSelect: (gender: Gender) => void;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const scale = boardScale(DESIGN, width, height);

  return (
    <ProfileStepLayout ctaDisabled={gender === null} onContinue={onContinue}>
      <View>
        <Option
          gender="boy"
          label="Эрэгтэй"
          selected={gender === 'boy'}
          scale={scale}
          onPress={() => onSelect('boy')}
        />
        <Option
          gender="girl"
          label="Эмэгтэй"
          selected={gender === 'girl'}
          scale={scale}
          onPress={() => onSelect('girl')}
        />
      </View>
    </ProfileStepLayout>
  );
}

function Option({
  gender,
  label,
  selected,
  scale,
  onPress,
}: {
  gender: Gender;
  label: string;
  selected: boolean;
  scale: number;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={styles.option}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      {/* Wraps the bubble rather than living inside it: the driver reaches the eye leaves
          through context, so `AvatarBubble` and `FigmaBoard` stay unaware of it, and the
          girl — who has no driven eyes — simply ignores it. */}
      <EyeOpenProvider open={selected}>
        <AvatarBubble
          gender={gender}
          selected={selected}
          scale={scale}
          label={label}
          characterOverride={gender === 'boy' ? BOY_EYES_DRIVEN : undefined}
        />
      </EyeOpenProvider>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  option: { alignItems: 'center' },
});
