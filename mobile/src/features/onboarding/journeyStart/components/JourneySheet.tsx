import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import Card from '@/assets/onboarding/journey-start/card.svg';

/**
 * The white rounded card behind the title/CTA (Figma node 204:11238, "Rectangle 26").
 * 379x360 at scale 1. `card.svg` is a plain fill with no baked-in shadow, so this adds
 * one in RN — matching the soft blue-tinted shadow the design uses under the card.
 *
 * Children are positioned by the caller using coordinates local to this card (i.e. the
 * page coordinate minus the card's own (5, 479) origin, times `scale`) — this component
 * only supplies the backdrop and the containing box.
 */

const WIDTH = 379;
const HEIGHT = 360;

export default function JourneySheet({ children, scale = 1 }: { children: ReactNode; scale?: number }) {
  return (
    <View style={[styles.card, { width: WIDTH * scale, height: HEIGHT * scale, borderRadius: 40 * scale }]}>
      <View style={StyleSheet.absoluteFill}>
        <Card width="100%" height="100%" />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#283C64',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
});
