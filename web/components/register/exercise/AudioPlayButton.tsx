import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { diagnostic } from "@/lib/content";
import ListeningMascot from "@/components/register/exercise/ListeningMascot";

/** The pointing hand beside the bubble, node 1270:22715. */
function BubbleHand() {
  return (
    <span aria-hidden="true" className="rotate-[-64deg] text-[15px] leading-none">
      ☝
    </span>
  );
}

interface AudioPlayButtonProps {
  src: string;
  /** The mascot is drawn at exercise 1's full size on cards whose only media
   *  it is, and smaller where it shares the card with a word to read and a
   *  field to write in. */
  size?: "lg" | "sm";
  className?: string;
}

const MASCOT_WIDTH = {
  lg: "[--mascot-w:clamp(180px,34vw,282px)]",
  sm: "[--mascot-w:clamp(132px,26vw,196px)]",
} as const;

/**
 * The play control for every task that carries audio (node 1270:22692's
 * media slot).
 *
 * The mascot *is* the button: it is the ORto globe wearing its earbuds, which
 * components/brand/Mascot.tsx already is — that file is a port of the same
 * Figma component ("Sound idle component", node 1202:7512) this card
 * instances, so it is reused rather than exported a second time. While
 * `isPlaying`, ListeningMascot layers on Mascot's "listening" state (eyes
 * closed, pulsing halo) plus the wave-bar/dot chrome, ported from mobile's
 * `CharacterAvatar`.
 *
 * Extracted from AudioChoice, which was the only card with audio while the
 * flow ran on the nine-exercise fixture. Live backend data carries `audio_url`
 * on roughly a third of all task types — dictation above all — and every one
 * of them gets this control rather than a browser `<audio controls>` bar.
 */
export default function AudioPlayButton({ src, size = "lg", className }: AudioPlayButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function handlePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    // `isPlaying` is driven by the audio element's own events below, not
    // guessed here — if this rejects (no source yet), the button just stays
    // inert instead of flashing the listening state and reverting.
    audio.play().catch(() => {});
  }

  return (
    // --mascot-w is the play button's width, named so the bubble can be
    // anchored as a fraction of the mascot instead of a hardcoded offset.
    <div className={cn("relative w-full", MASCOT_WIDTH[size], className)}>
      <audio
        ref={audioRef}
        preload="none"
        src={src}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={handlePlay}
        aria-label={diagnostic.audioHint}
        className={cn(
          "mx-auto block w-[var(--mascot-w)] rounded-card transition-transform duration-150 ease-press focus-ring",
          isPlaying ? "scale-95" : "hover:-translate-y-0.5"
        )}
      >
        <ListeningMascot playing={isPlaying} className="w-full" />
      </button>

      {/* Floats over the mascot's upper right at every width, so it can never
          shift the character off the card's centre — `pointer-events-none`
          because the whole mascot underneath it is the play button.
          Current Figma (node 1293:23019) draws a "Сонсох" pill *below* the
          mascot instead; this bubble is a deliberate divergence, kept at the
          user's request — don't silently restore the pill. */}
      <p className="pointer-events-none absolute top-0 right-0 w-[min(150px,42%)] rounded-[36px] border border-[#d7e4ff] bg-white px-4 py-2.5 text-[13px]/4.5 font-bold text-[#0b2e93] shadow-[0px_5px_6px_rgba(124,150,200,0.18)] sm:top-[6%] sm:right-auto sm:left-[calc(50%+var(--mascot-w)*0.4)] sm:w-[min(150px,calc(var(--mascot-w)*0.55))] sm:px-6 sm:py-3.5 sm:text-[15px]/5">
        {diagnostic.audioPrompt} <BubbleHand />
      </p>
    </div>
  );
}
