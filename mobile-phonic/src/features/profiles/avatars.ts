import type { ImageId } from '../../assets/manifest';
import type { AvatarId } from '../../store/progress';
import { colors } from '../../theme/tokens';

// Profile avatars are the four characters; colour is the bubble behind each.
export const AVATARS: { id: AvatarId; image: ImageId; color: string }[] = [
  { id: 'orto', image: 'chr_orto', color: colors.skyDeep },
  { id: 'narhan', image: 'chr_narhan', color: colors.sun },
  { id: 'sprout', image: 'chr_sprout', color: colors.leaf },
  { id: 'buddy', image: 'chr_buddy', color: colors.ember },
];

export const avatarById = (id: AvatarId) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];
