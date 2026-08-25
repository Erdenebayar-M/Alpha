import MessageSlide from '@/src/features/onboarding/slides/MessageSlide';
import { colors } from '@/src/theme/colors';

const mascot = require('@/assets/onboarding/slide2/mascot.png');

/** Figma 142:1677 — "Орто найзтайгаа Цээж бичгээ давтъя !" */
const LINES = [
  { text: 'Орто', colour: colors.brandYellowBright, weight: 'black' as const },
  { text: 'найзтайгаа' },
  { text: 'Цээж бичгээ', colour: colors.brandGold },
  { text: 'давтъя !' },
];

// Container box (node 142:1681): left = 50% + 15.5px - width/2, top = 50%, bottom = 33.13%.
const MASCOT_RECT = { left: 119, top: 422, width: 183, height: 142.34 };

export default function Slide2({ play, width, height }: { play: boolean; width: number; height: number }) {
  return (
    <MessageSlide
      lines={LINES}
      mascot={{ source: mascot, rect: MASCOT_RECT }}
      play={play}
      width={width}
      height={height}
    />
  );
}
