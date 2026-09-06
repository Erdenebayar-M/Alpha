import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { screenChrome } from '@/src/components/screenChrome';

/** A centered message — the "couldn't load" state dashboard.tsx and plan.tsx both
 *  show for a query error other than "not diagnosed yet". */
export default function LoadFailedScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={screenChrome.centered} edges={['top', 'bottom']}>
      <Text style={screenChrome.muted}>{message}</Text>
    </SafeAreaView>
  );
}
