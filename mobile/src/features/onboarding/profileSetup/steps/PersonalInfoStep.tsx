import { useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { GazeProvider } from '@/src/features/onboarding/idleLoops';
import { boardScale, DESIGN, MIN_TYPE_SCALE, useKeyboardStableHeight } from '@/src/features/onboarding/motion';
import AgeWheel from '@/src/features/onboarding/profileSetup/components/AgeWheel';
import AvatarBubble from '@/src/features/onboarding/profileSetup/components/AvatarBubble';
import ProfileStepLayout from '@/src/features/onboarding/profileSetup/components/ProfileStepLayout';
import {
  BOY_OPEN_EYES_GAZE,
  GIRL_GAZE,
  type Gender,
} from '@/src/features/onboarding/profileSetup/genderCharacters';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/** Which control the user is currently pointing at — drives the character's gaze. Kept
 *  as an id rather than a plain boolean so switching focus directly between the two
 *  name fields can't leave a stray "look up" flicker between one's blur and the next's
 *  focus: the outgoing field's blur only clears the id if nothing else has claimed it. */
type PointedField = 'surname' | 'givenName' | 'age' | null;

/**
 * Step 2 (Figma `804-9969` idle / `804-10250` filled): surname, given name, age.
 *
 * Measured geometry (`get_metadata` on 804:9969): the character block occupies 187 of
 * vertical space, then a 10px gap, then label/field pairs of 22 and 39 with 10px gaps.
 *
 * The age wheel always has a value under its centre line, so Continue gates on the two
 * name fields only.
 *
 * The boy arrives already awake: he opened his eyes back on the Gender step
 * (`GenderStep.tsx`), so this uses `BOY_OPEN_EYES_GAZE` — the same character without
 * the one-shot opening (which would otherwise replay on every arrival here), but with a
 * `GazeProvider` above it so his eyes glance down at whichever field is currently
 * focused/being dragged, and back up otherwise. Grade does the same.
 */

/** Figma gives the 233-tall character cell only 187px of layout space here. */
const CHARACTER_BLOCK = 187;
const GAP = 10;
const LABEL_HEIGHT = 22;
const FIELD_HEIGHT = 39;

export default function PersonalInfoStep({
  gender,
  surname,
  givenName,
  age,
  onChangeSurname,
  onChangeGivenName,
  onChangeAge,
  onContinue,
}: {
  gender: Gender;
  surname: string;
  givenName: string;
  age: number;
  onChangeSurname: (value: string) => void;
  onChangeGivenName: (value: string) => void;
  onChangeAge: (value: number) => void;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  // Frozen in lockstep with `ProfileStepLayout`'s own frozen scale (avoidsKeyboard),
  // so the avatar/fields don't rescale when Android's keyboard resizes the window.
  const stableHeight = useKeyboardStableHeight(height);
  const scale = boardScale(DESIGN, width, stableHeight, MIN_TYPE_SCALE);
  const canContinue = surname.trim().length > 0 && givenName.trim().length > 0;

  const [pointing, setPointing] = useState<PointedField>(null);
  const point = (field: PointedField) => () => setPointing(field);
  const unpoint = (field: PointedField) => () => setPointing((cur) => (cur === field ? null : cur));

  return (
    <ProfileStepLayout ctaDisabled={!canContinue} onContinue={onContinue} avoidsKeyboard>
      <GazeProvider down={pointing !== null}>
        <AvatarBubble
          gender={gender}
          scale={scale}
          blockHeight={CHARACTER_BLOCK}
          characterOverride={gender === 'boy' ? BOY_OPEN_EYES_GAZE : GIRL_GAZE}
        />
      </GazeProvider>

      <View style={{ width: '100%', gap: GAP * scale, marginTop: GAP * scale }}>
        <Label scale={scale}>Овог</Label>
        <Field
          value={surname}
          onChangeText={onChangeSurname}
          placeholder="Батсайхан"
          scale={scale}
          onFocus={point('surname')}
          onBlur={unpoint('surname')}
        />

        <Label scale={scale}>Нэр</Label>
        <Field
          value={givenName}
          onChangeText={onChangeGivenName}
          placeholder="Цэцэгмаа"
          scale={scale}
          onFocus={point('givenName')}
          onBlur={unpoint('givenName')}
        />

        <Label scale={scale}>Нас</Label>
        <AgeWheel
          value={age}
          onChange={onChangeAge}
          scale={scale}
          onDragStart={point('age')}
          onDragEnd={unpoint('age')}
        />
      </View>
    </ProfileStepLayout>
  );
}

function Label({ children, scale }: { children: string; scale: number }) {
  return (
    <Text style={[styles.label, { fontSize: 14 * scale, lineHeight: LABEL_HEIGHT * scale }]}>
      {children}
    </Text>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  scale,
  onFocus,
  onBlur,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  scale: number;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <TextInput
      style={[
        styles.input,
        { height: FIELD_HEIGHT * scale, borderRadius: 24 * scale, paddingHorizontal: 16 * scale, fontSize: 14 * scale },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.profileInputPlaceholder}
      autoCapitalize="words"
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.semibold,
    color: colors.profileLabelText,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.profileInputBorder,
    backgroundColor: colors.white,
    // Figma specs Nunito Sans Medium (500); only the 400 and 900 cuts are bundled
    // (src/theme/typography.ts), so this is the closest available weight.
    fontFamily: fonts.sansRegular,
    color: colors.textNavy,
  },
});
