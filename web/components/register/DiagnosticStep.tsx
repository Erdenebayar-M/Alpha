import { useRef, useState } from "react";
import { diagnostic } from "@/lib/content";
import ChoiceCard from "@/components/ui/ChoiceCard";

interface DiagnosticStepProps {
  answer: string | null;
  onChangeAnswer: (choice: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

/** The round "Дууг сонсох" play button's waveform — hand-authored to match
 *  Figma's exported glyph (node 1218:13792) rather than committing a raster
 *  asset, the same call already made for Flower.tsx/Tree.tsx. */
function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 42 42" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <line x1="8" y1="15" x2="8" y2="27" />
        <line x1="16" y1="9" x2="16" y2="33" />
        <line x1="24" y1="4" x2="24" y2="38" />
        <line x1="32" y1="12" x2="32" y2="30" />
      </g>
    </svg>
  );
}

/** Step 2 of the register-child flow, node 1218:13643 / card 1218:13786
 *  ("Question card"). */
export default function DiagnosticStep({ answer, onChangeAnswer, onNext, onSkip }: DiagnosticStepProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function handlePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(true);
    audio.currentTime = 0;
    // The mp3 hasn't landed in public/audio/ yet — swallow the rejection so a
    // missing file leaves the button inert instead of throwing.
    audio.play().catch(() => setIsPlaying(false));
  }

  return (
    <div className="flex flex-col items-center gap-[clamp(20px,4dvh,32px)] text-center">
      <audio ref={audioRef} preload="none" src={diagnostic.audioSrc} onEnded={() => setIsPlaying(false)} />

      <div className="animate-step-in flex flex-col items-center gap-2.5 [animation-delay:0ms]">
        <p className="text-sm font-black tracking-[0.7px] text-accent-question uppercase">{diagnostic.eyebrow}</p>
        <p className="text-[28px] leading-[1.3] font-black text-text-question">{diagnostic.question}</p>
      </div>

      <div className="animate-step-in flex flex-col items-center gap-2.5 [animation-delay:60ms]">
        <button
          type="button"
          onClick={handlePlay}
          aria-label={diagnostic.audioHint}
          className={`flex size-[clamp(72px,11dvh,104px)] items-center justify-center rounded-full border-2 border-accent-question bg-surface-lilac text-accent-question transition-transform duration-150 ease-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${isPlaying ? "scale-95" : "hover:-translate-y-px"}`}
        >
          <WaveformIcon className="size-[42px]" />
        </button>
        <p className="text-sm font-extrabold text-text-nav">{diagnostic.audioHint}</p>
      </div>

      <fieldset className="m-0 flex w-full min-w-0 animate-step-in flex-col gap-2.5 border-0 p-0 [animation-delay:120ms]">
        <legend className="sr-only">{diagnostic.question}</legend>
        {diagnostic.choices.map((choice) => (
          <ChoiceCard
            key={choice}
            name="diagnostic-answer"
            value={choice}
            checked={answer === choice}
            onChange={onChangeAnswer}
            marker
            className="w-full"
          >
            <span className="text-[17px] font-extrabold text-text-navy">{choice}</span>
          </ChoiceCard>
        ))}
      </fieldset>

      <div className="flex w-full animate-step-in items-center justify-between [animation-delay:180ms]">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-sm text-sm font-extrabold text-text-nav focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          {diagnostic.skipLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={answer === null}
          className="rounded-xl bg-brand-green px-[30px] py-4 text-[17px] font-bold text-white transition-[transform,box-shadow] duration-150 ease-press hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {diagnostic.nextLabel}
        </button>
      </div>
    </div>
  );
}
