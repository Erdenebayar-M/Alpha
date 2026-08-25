import MessageSlide from '@/src/features/onboarding/slides/MessageSlide';

/** Figma 142:1839 — "Алдаа гаргахвий гэж битгий айгаарай" */
const LINES = [
  { text: 'Алдаа' },
  { text: 'гаргахвий гэж' },
  { text: 'битгий' },
  { text: 'айгаарай' },
] as const;

export default function Slide3({ play, scale }: { play: boolean; scale: number }) {
  return <MessageSlide lines={LINES} play={play} scale={scale} />;
}
