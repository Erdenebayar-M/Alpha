import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { screenChrome } from '@/src/components/screenChrome';
import { colors } from '@/src/theme/colors';

/** A bare centered spinner — the loading state dashboard.tsx and plan.tsx both show
 *  while their query is in flight. */
export default function LoadingScreen() {
  return (
    <SafeAreaView style={screenChrome.centered} edges={['top', 'bottom']}>
      <ActivityIndicator color={colors.progressFill} />
    </SafeAreaView>
  );
}
