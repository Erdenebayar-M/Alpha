import Svg, { Path } from 'react-native-svg';

import { colors } from '@/src/theme/colors';

interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronLeftIcon({ size = 18, color = colors.backButtonIcon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
