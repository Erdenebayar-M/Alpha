import { useMemo, useState } from "react";

interface Placement {
  readonly slot: number;
  readonly tileIndex: number;
  readonly letter: string;
}

export interface LetterFill {
  /** One entry per slot: the letter placed there, or null while it is empty. */
  readonly letters: readonly (string | null)[];
  /** Tile indexes already spent, so the bank can grey them out. */
  readonly usedTiles: ReadonlySet<number>;
  readonly isComplete: boolean;
  /** The letters so far, for reporting the attempt. */
  readonly word: string;
  /** Puts a tile into the first empty slot. No-op once every slot is full. */
  readonly place: (tileIndex: number, letter: string) => void;
  /** Empties one slot and returns its tile to the bank. */
  readonly clearSlot: (slot: number) => void;
}

/**
 * Tap-a-tile-to-fill-the-next-slot, shared by the two letter exercises —
 * "Үгийг нөхөх" (node 1251:16251) fills the blanks inside a partly written
 * word, "Үг бүтээгээрэй" (node 1255:17489) builds a whole one. mobile splits
 * these into two renderers over shared hooks (useFillTiles / useAssembleWord)
 * for the same reason they are split here: they mean different things and are
 * drawn differently, but the placement logic is one behaviour.
 */
export function useLetterFill(slotCount: number): LetterFill {
  const [placements, setPlacements] = useState<readonly Placement[]>([]);

  return useMemo(() => {
    const letters: (string | null)[] = Array.from({ length: slotCount }, () => null);
    const usedTiles = new Set<number>();
    for (const placement of placements) {
      letters[placement.slot] = placement.letter;
      usedTiles.add(placement.tileIndex);
    }

    return {
      letters,
      usedTiles,
      isComplete: placements.length === slotCount,
      word: letters.map((letter) => letter ?? "").join(""),
      place(tileIndex, letter) {
        setPlacements((previous) => {
          if (previous.some((placement) => placement.tileIndex === tileIndex)) return previous;
          const taken = new Set(previous.map((placement) => placement.slot));
          const slot = Array.from({ length: slotCount }, (_, index) => index).find((index) => !taken.has(index));
          return slot === undefined ? previous : [...previous, { slot, tileIndex, letter }];
        });
      },
      clearSlot(slot) {
        setPlacements((previous) => previous.filter((placement) => placement.slot !== slot));
      },
    };
  }, [placements, slotCount]);
}
