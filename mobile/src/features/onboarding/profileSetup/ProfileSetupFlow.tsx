import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { DEFAULT_AGE } from '@/src/features/onboarding/profileSetup/components/AgeWheel';
import type { Gender } from '@/src/features/onboarding/profileSetup/genderCharacters';
import GenderStep from '@/src/features/onboarding/profileSetup/steps/GenderStep';
import GradeStep from '@/src/features/onboarding/profileSetup/steps/GradeStep';
import PersonalInfoStep from '@/src/features/onboarding/profileSetup/steps/PersonalInfoStep';
import { colors } from '@/src/theme/colors';

type Step = 'gender' | 'personalInfo' | 'grade';

/**
 * Gender -> character -> personal info -> grade (Figma 804-8990 / 804-9634 / 804-9969 /
 * 804-10250 / 804-10366 / 825-10618). Runs right after `OnboardingCarousel` at the top
 * of today's lesson (`app/(app)/learner/[id]/lesson.tsx`).
 *
 * Same `{ onDone }` contract as `OnboardingCarousel`, and the same "one screen, internal
 * step state" shape — advanced by an explicit Continue tap per step rather than a swipe,
 * since none of these frames show a drag affordance. Everything collected here is local
 * state only: there is no backend field for gender/age yet, so nothing is submitted.
 *
 * Deliberately NOT wrapped in a top-inset SafeAreaView: `ProfileStepLayout` places its
 * content at Figma's own frame coordinates, which are measured from the very top of the
 * screen and already account for the status bar. Insetting here would shift every step
 * down by the status-bar height. The layout clears the bottom inset itself.
 */
export default function ProfileSetupFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<Gender | null>(null);
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  // The age wheel always has a value under its centre line, so this starts set rather
  // than null — see `AgeWheel`.
  const [age, setAge] = useState<number>(DEFAULT_AGE);
  const [grade, setGrade] = useState<number | null>(null);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'gender' ? (
          <GenderStep gender={gender} onSelect={setGender} onContinue={() => setStep('personalInfo')} />
        ) : null}

        {step === 'personalInfo' && gender ? (
          <PersonalInfoStep
            gender={gender}
            surname={surname}
            givenName={givenName}
            age={age}
            onChangeSurname={setSurname}
            onChangeGivenName={setGivenName}
            onChangeAge={setAge}
            onContinue={() => setStep('grade')}
          />
        ) : null}

        {step === 'grade' && gender ? (
          <GradeStep gender={gender} grade={grade} onSelect={setGrade} onContinue={onDone} />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
});
