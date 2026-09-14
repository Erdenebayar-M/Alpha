import { useState } from "react";

export interface TextEntry {
  readonly value: string;
  readonly setValue: (value: string) => void;
  readonly isComplete: boolean;
}

/**
 * One free-text answer field, shared by every live renderer that is
 * fundamentally "show some context, type an answer" — fill_generic,
 * sentence_fill, correction, dictation/mini_text, self_check, copy_text,
 * visual_memory. Mirrors the fixture's useLetterFill/usePlacement pattern:
 * one small hook per interaction, reused across renderers rather than each
 * renderer re-deriving its own text state.
 */
export function useTextEntry(): TextEntry {
  const [value, setValue] = useState("");
  return { value, setValue, isComplete: value.trim().length > 0 };
}
