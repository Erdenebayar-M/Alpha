'use client';
import { useRef, useState } from 'react';

export type SpeechState = 'idle' | 'playing' | 'done';

function getMnVoice(): SpeechSynthesisVoice | null {
  return (
    window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('mn')) ?? null
  );
}

function makeUtterance(text: string): SpeechSynthesisUtterance {
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.8;
  utt.pitch = 1.0;
  const mn = getMnVoice();
  if (mn) {
    utt.voice = mn;
    utt.lang = mn.lang;
  }
  return utt;
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>('idle');
  const [wordIndex, setWordIndex] = useState(-1);
  const cancelRef = useRef(false);

  function speakWords(words: string[], onDone?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    cancelRef.current = false;
    setState('playing');

    let i = 0;
    function next() {
      if (cancelRef.current || i >= words.length) {
        setState('done');
        setWordIndex(-1);
        onDone?.();
        return;
      }
      setWordIndex(i);
      const utt = makeUtterance(words[i]);
      utt.onend = () => { i++; setTimeout(next, 900); };
      utt.onerror = () => { i++; setTimeout(next, 900); };
      window.speechSynthesis.speak(utt);
    }
    next();
  }

  function speakText(text: string, onDone?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    cancelRef.current = false;
    setState('playing');
    const utt = makeUtterance(text);
    utt.onend = () => { setState('done'); onDone?.(); };
    utt.onerror = () => setState('done');
    window.speechSynthesis.speak(utt);
  }

  function cancel() {
    cancelRef.current = true;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setState('idle');
    setWordIndex(-1);
  }

  return { state, wordIndex, speakWords, speakText, cancel };
}
