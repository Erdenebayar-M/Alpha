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

export function ArrowRightIcon({ size = 28, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12h15M13 5l7 7-7 7"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function BackspaceIcon({ size = 26, color = colors.textChoice }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-1.5-.7L2.5 13a1.5 1.5 0 0 1 0-2l5-5.3A2 2 0 0 1 9 5z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 9.5l5 5M17 9.5l-5 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
