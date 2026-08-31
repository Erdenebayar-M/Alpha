import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { hypotSize } from '@/src/features/onboarding/FigmaBoard';
import MessageSlide from '@/src/features/onboarding/slides/MessageSlide';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const mascot = require('@/assets/onboarding/slide3/mascot.png');

/** Figma 142:1839 — "Алдаа гаргахвий гэж битгий айгаарай" */
const LINES = [
  { text: 'Алдаа' },
  { text: 'гаргахвий гэж' },
  { text: 'битгий' },
  { text: 'айгаарай' },
];

// Container box (node 142:1857): a circular mascot, clipped in RN via borderRadius.
const MASCOT_RECT = { left: 133, top: 442, width: 105, height: 108 };

// "Орто" cap label (node 142:1858): a rotated box sized with Figma's hypot(cqw,cqh).
// left/top are nudged ~10-12px left/down from Figma's own declared box — its <p> has a
// 40px line-height on 8px text (a much bigger mismatch than slide 2's headline), which
// visibly shifts the glyph's rendered centre within the box. Measured directly against
// a full Figma composite (mascot + label together, not just the label's own geometry)
// and matched empirically rather than re-deriving the line-box math.
const LABEL_BOX = { left: 153, top: 433.5, width: 57.49, height: 43.46 };
const LABEL_INNER = {
  width: hypotSize(LABEL_BOX, [84.7561, -34.6877]),
  height: hypotSize(LABEL_BOX, [15.2439, 65.3123]),
};
const LABEL_ROTATE = -17.17;

export default function Slide3({ play, width, height }: { play: boolean; width: number; height: number }) {
  return (
    <MessageSlide
      lines={LINES}
      mascot={{ source: mascot, rect: MASCOT_RECT, circular: true }}
      play={play}
      width={width}
      height={height}
      renderOverlay={(scale, style) => (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.labelOuter,
            {
              left: LABEL_BOX.left * scale,
              top: LABEL_BOX.top * scale,
              width: LABEL_BOX.width * scale,
              height: LABEL_BOX.height * scale,
            },
            style,
          ]}
        >
          <View
            style={[
              { width: LABEL_INNER.width * scale, height: LABEL_INNER.height * scale },
              { transform: [{ rotate: `${LABEL_ROTATE}deg` }] },
              styles.labelInner,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                { fontSize: 8 * scale, lineHeight: 10 * scale, letterSpacing: -0.08 * scale },
              ]}
            >
              Орто
            </Text>
          </View>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  labelOuter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  labelInner: { alignItems: 'center', justifyContent: 'center' },
  labelText: {
    fontFamily: fonts.sansBlack,
    color: colors.brandYellowBright,
    textAlign: 'center',
  },
});
