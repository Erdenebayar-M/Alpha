import MessageSlide from '@/src/features/onboarding/slides/MessageSlide';
import { colors } from '@/src/theme/colors';

/** Figma 142:1677 — "Орто найзтайгаа Цээж бичгээ давтъя !" */
const LINES = [
  { text: 'Орто', colour: colors.brandYellowBright },
  { text: 'найзтайгаа' },
  { text: 'Цээж бичгээ', colour: colors.brandGold },
  { text: 'давтъя !' },
] as const;

export default function Slide2({ play, scale }: { play: boolean; scale: number }) {
  return <MessageSlide lines={LINES} play={play} scale={scale} />;
}
