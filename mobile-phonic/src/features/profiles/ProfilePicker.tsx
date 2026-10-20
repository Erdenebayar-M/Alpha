import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../../components/BackButton';
import { BubbleButton } from '../../components/BubbleButton';
import { Character } from '../../components/Character';
import { MAX_PROFILES, useProgress, type AvatarId } from '../../store/progress';
import { bubble, bubbleArt, colors, fonts, fontSize, space } from '../../theme/tokens';
import { AVATARS, avatarById } from './avatars';

interface Props {
  onPlay: () => void;
}

interface AvatarBubbleProps {
  avatar: AvatarId;
  label: string;
  onPress: () => void;
}

function AvatarBubble({ avatar, label, onPress }: AvatarBubbleProps) {
  const a = avatarById(avatar);
  return (
    <BubbleButton color={a.color} accessibilityLabel={label} onPress={onPress}>
      <Character id={a.image} size={bubble * bubbleArt} />
    </BubbleButton>
  );
}

/** Who is playing? Tap your avatar; "+" adds a child. No typing (CONTEXT.md: Profile). */
export function ProfilePicker({ onPlay }: Props) {
  const profiles = useProgress((s) => s.profiles);
  const addProfile = useProgress((s) => s.addProfile);
  const selectProfile = useProgress((s) => s.selectProfile);
  const [choosing, setChoosing] = useState(profiles.length === 0);

  const pick = (id: string) => {
    selectProfile(id);
    onPlay();
  };

  const create = (avatar: AvatarId) => {
    const p = addProfile(avatar);
    setChoosing(false);
    if (p) pick(p.id);
  };

  if (choosing) {
    const free = AVATARS.filter((a) => !profiles.some((p) => p.avatar === a.id));
    return (
      <View style={styles.row}>
        {profiles.length > 0 && (
          <BackButton onPress={() => setChoosing(false)} />
        )}
        {free.map((a) => (
          <AvatarBubble key={a.id} avatar={a.id} label={`avatar-${a.id}`} onPress={() => create(a.id)} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {profiles.map((p) => (
        <AvatarBubble key={p.id} avatar={p.avatar} label={`profile-${p.id}`} onPress={() => pick(p.id)} />
      ))}
      {profiles.length < MAX_PROFILES && (
        <BubbleButton accessibilityLabel="add-profile" onPress={() => setChoosing(true)}>
          <Text style={styles.glyph}>+</Text>
        </BubbleButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.lg, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.black, fontSize: fontSize.plus, color: colors.skyDeep },
});
