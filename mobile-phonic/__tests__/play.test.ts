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

describe('playQueue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('plays clips in order and calls onDone after the last', () => {
    const { playQueue } = jest.requireActual('../src/audio/play') as typeof import('../src/audio/play');
    useProgress.getState().setSoundOn(true);
    const spoken: string[] = [];
    (Speech.speak as jest.Mock).mockImplementation((text: string, opts: { onDone: () => void }) => {
      spoken.push(text);
      opts.onDone();
    });
    const onDone = jest.fn();
    playQueue(['ph_m', 'ph_a', 'w_am'], onDone);
    expect(spoken).toEqual(['ммм', 'а', 'ам']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('an interrupted queue skips the rest but still settles once, as interrupted', async () => {
    useProgress.getState().setSoundOn(true);
    const pending: (() => void)[] = [];
    (Speech.speak as jest.Mock).mockImplementation((_t: string, opts: { onDone: () => void }) => pending.push(opts.onDone));
    const onSettled = jest.fn();
    const { playQueue, playAsset } = jest.requireActual('../src/audio/play') as typeof import('../src/audio/play');
    playQueue(['ph_m', 'ph_a'], onSettled);
    playAsset('ph_o');
    await Promise.resolve();
    pending[0](); // a late native "done" for the interrupted clip changes nothing
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(true);
    expect(Speech.speak).toHaveBeenCalledTimes(2);
  });

  it('settles at once when sound is off', () => {
    useProgress.getState().setSoundOn(false);
    const onSettled = jest.fn();
    const { playAsset } = jest.requireActual('../src/audio/play') as typeof import('../src/audio/play');
    playAsset('ph_m', onSettled);
    expect(onSettled).toHaveBeenCalledWith(false);
  });
});
