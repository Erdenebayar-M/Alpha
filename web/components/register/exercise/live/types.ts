/** What every live-only renderer receives — position for the count badge,
 *  the adapted props for this task, and onResult reporting the raw answer
 *  (before lib/api/adapt.ts's `toInputText` turns it into the wire format). */
export interface LiveExerciseProps<T> {
  readonly task: T;
  readonly position: number;
  readonly onResult: (answer: string) => void;
}
