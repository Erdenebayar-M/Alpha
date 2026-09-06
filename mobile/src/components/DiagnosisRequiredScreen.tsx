import { router } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableScale from '@/src/components/PressableScale';
import { screenChrome } from '@/src/components/screenChrome';
import { START_DIAGNOSTIC_LABEL } from '@/src/features/plan/planFormat';

/** The "no diagnostic yet" empty state — dashboard.tsx and plan.tsx both show this
 *  (title + message + a CTA into the diagnostic) before a learner has any results. */
export default function DiagnosisRequiredScreen({
  learnerId,
  title,
  message,
}: {
  learnerId: string;
  title: string;
  message: string;
}) {
  return (
    <SafeAreaView style={screenChrome.centered} edges={['top', 'bottom']}>
      <Text style={screenChrome.title}>{title}</Text>
      <Text style={screenChrome.muted}>{message}</Text>
      <PressableScale
        style={screenChrome.primaryButton}
        onPress={() => router.replace(`/learner/${learnerId}/diagnostic`)}
      >
        <Text style={screenChrome.primaryButtonText}>{START_DIAGNOSTIC_LABEL}</Text>
      </PressableScale>
    </SafeAreaView>
  );
}
