import { useWindowDimensions } from 'react-native';
import { bubble, space } from '../../../theme/tokens';

/**
 * The room a Game may lay out in: the window minus GameShell's padding and, on both
 * sides so content stays centred, the space Orto's corner bubble needs. Size every
 * Game piece off this — never off the raw window.
 */
export function useGameArea() {
  const { width, height } = useWindowDimensions();
  const inset = bubble + space.lg;
  return {
    width: Math.max(0, width - 2 * space.xl - 2 * inset),
    height: Math.max(0, height - 2 * space.xl),
    inset,
  };
}
