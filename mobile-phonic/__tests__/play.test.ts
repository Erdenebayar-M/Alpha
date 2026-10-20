import * as Speech from 'expo-speech';
import { playAudio } from '../src/audio/play';
import { useProgress } from '../src/store/progress';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

describe('playAudio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('speaks a placeholder clip when sound is on', () => {
    useProgress.getState().setSoundOn(true);
    playAudio('ph_m');
    expect(Speech.speak).toHaveBeenCalledWith('ммм', expect.anything());
  });

  it('stays silent when sound is off', () => {
    useProgress.getState().setSoundOn(false);
    playAudio('ph_m');
    expect(Speech.speak).not.toHaveBeenCalled();
  });
});
