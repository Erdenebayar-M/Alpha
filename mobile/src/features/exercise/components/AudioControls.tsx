import Slider from '@react-native-community/slider';
import type { AudioPlayer } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { VOLUME_HIGH_SVG, VOLUME_MUTE_SVG } from '@/src/features/exercise/components/volumeIcons';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const TEMPO_OPTIONS = [0.5, 1.0, 1.5];
const muteIcon = VOLUME_MUTE_SVG.replace('__C__', colors.sliderThumb);
const highIcon = VOLUME_HIGH_SVG.replace('__C__', colors.sliderThumb);

interface AudioControlsProps {
  player: AudioPlayer;
}

export default function AudioControls({ player }: AudioControlsProps) {
  const [volume, setVolume] = useState(player.volume);
  const [rate, setRate] = useState(player.playbackRate || 1.0);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    player.volume = value;
  };

  const handleRateSelect = (value: number) => {
    setRate(value);
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(value, 'high');
  };

  return (
    <View style={styles.card}>
      <View style={styles.sliderRow}>
        <SvgXml xml={muteIcon} width={20} height={20} />
        <Slider
          style={styles.slider}
          value={volume}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor={colors.sliderActive}
          maximumTrackTintColor={colors.sliderTrack}
          thumbTintColor={colors.sliderThumb}
          onValueChange={handleVolumeChange}
        />
        <SvgXml xml={highIcon} width={20} height={20} />
      </View>

      <View style={styles.pillRow}>
        {TEMPO_OPTIONS.map((option) => {
          const isActive = rate === option;
          return (
            <Pressable
              key={option}
              style={[styles.pill, isActive && styles.pillActive]}
              hitSlop={8}
              onPress={() => handleRateSelect(option)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{option.toFixed(1)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
  },
  pill: {
    flex: 1,
    minHeight: 28,
    borderRadius: 12,
    backgroundColor: colors.pillTrack,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: colors.pillActiveBg,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.pillTextInactive,
  },
  pillTextActive: {
    fontFamily: fonts.extrabold,
    color: colors.pillTextActive,
  },
});
