# Game specs (M2)

Each Game kind is one renderer in `src/features/games/<kind>/`, registered in
`registry.ts` (ADR 0003). Read `CONTEXT.md`, `AGENTS.md` and the ADRs first.

## Contract (all kinds)

- Export one component `XxxGame(props: GameProps<'<kind>'>)` from `<kind>/XxxGame.tsx`.
- Wrap everything in `<GameShell kind="<kind>">`. It speaks the instruction and
  provides drop zones. Build only from `../kit` (Draggable, DropZone, LetterTile,
  PictureCard, ListenButton, useAnswers, useShake, encourageRetry) plus your own
  files. If you need something shared that the kit lacks, **don't copy it into your
  folder**. Write the need into `src/features/games/<kind>/KIT_REQUEST.md` and build
  on a local stand-in so the project lead can promote it into the kit.
- Every random choice uses `ctx.rng` (seeded). Look things up with `ctx.soundById`,
  `ctx.wordById`, `ctx.segmentWord`, `ctx.decodableWords`, `ctx.taught` and `ctx.weak`.
  Pick review or distractor Sounds with `pickReviewSounds` (`src/engine/remix.ts`).
- Record every answer with `useAnswers().record(soundId, correct)`. When the Game ends,
  call `onFinish(answers.result())` **exactly once**. A Game takes about 60 s.
- Wrong answer: `shake()` the piece, call `encourageRetry()`, record it as wrong, and
  let the child try the same item again. Never use red, a cross, or "wrong" anywhere.
- Correct answer: a small bounce or pop and move on. Praise between Games is handled
  by the Level runner; don't play `fb_good_*` yourself.
- Audio: Sounds via `playAsset(sound.audio)`, words via `playAsset(word.audio)`.
  No text a child must read. Graphemes on tiles are the learning content, so they're fine.
- Sizes, colours and timings come from `src/theme/tokens.ts`. Add new tokens there if
  needed; that is the only shared file you may touch besides your registry line.
- Landscape iPad first (1376×1032 pt on the 13"), but it must also fit iPhone
  landscape. Size off `useWindowDimensions`; touch targets ≥ `touchMin`.
- Tests in `__tests__/games/<kind>.test.tsx` (RNTL v14: `render`, `renderHook` and
  `act` are async, so always `await`). Test the round-building logic as pure functions
  (put it in `<kind>/rounds.ts`), and render-test that a full correct playthrough calls
  `onFinish` once with the right answers. Mock `../../src/audio/play`.

## hear-tap — "Hear & Tap"
6 rounds. Rounds 1, 2, 4 and 6 target `game.focus`. Rounds 3 and 5 target review Sounds
from `pickReviewSounds({ taught, weak, exclude: [focus], count: 2 })`. If fewer exist,
use the focus again. Each round plays the target Sound and shows 3 LetterTiles (the
target + 2 distractors) in shuffled positions. Distractors come from taught Sounds other
than the target. If fewer than 2 exist (Level 1), fill from the next Sounds in Learning-path
order (`levelOrder`). A ListenButton replays the target. Tapping the target pops it and
moves to the next round. A wrong tap dims that tile, shakes it and records a mistake; the
child taps again. Record each tap as `(target, correct)`.

## trace — "Trace"
The Grapheme for `game.sound` is drawn large as a faint guide (react-native-svg). Each
letter has one or more strokes, each an ordered list of checkpoints in a 0–1 box, stored
in `trace/strokes.ts` for the 11 World 1 Graphemes а м о н у л э с и ө ү (hand-written
in lowercase Cyrillic print order). The child drags along the current stroke and the ink
follows the finger. Progress is made when the finger comes within a tolerance of the next
checkpoint. Straying farther than about 2× the tolerance from the path resets that stroke:
record `(sound, false)`, shake, and call encourageRetry. The letter is traced 3 times, and
each completed tracing records `(sound, true)` and plays the Sound. Start dot and arrow show
where to begin. Validate in tests that every World 1 Sound has strokes and that the
checkpoints are within 0–1.

## build-word — "Build the Word"
For each word in `game.words` (at most 4): play the word. Show one empty slot per Sound
(`ctx.segmentWord`) and below them the word's tiles plus up to 2 distractor tiles
(`pickReviewSounds` over taught, excluding the word's Sounds), shuffled. Each slot is a
DropZone and each tile a Draggable. Dropping the right tile on a slot locks it there:
record `(slotSound, true)` and play that Sound. A tile on the wrong slot springs back:
record `(slotSound, false)`, shake, encourageRetry. When every slot is full, play the
Sounds in order, then the word, then go to the next word.

## blend-pick — "Blend & Pick"
For each word in `game.words` (at most 3): show its LetterTiles in a row with a slide
track under them. Dragging a finger along the track plays each Sound as the finger
passes under its tile, and reaching the end plays the whole word. Then show 3 PictureCards:
the target and 2 distractors from `ctx.decodableWords`, preferring words with an image.
If fewer than 2 decodable words exist, use any curriculum word that has a different first
Sound. Tapping the right card records `(s, true)` for each of the word's Sounds and moves
on. A wrong card shakes and dims, records `(firstSound, false)`, encourageRetry, and the
child tries again.

## sort — "Sound Sort"
Two baskets, each a DropZone showing the LetterTile of one of `game.sounds` and a
ListenButton for it. The words in `game.words` appear one at a time in the centre as
draggable PictureCards (shuffled), and tapping a card plays the word. Dropping it on the
basket of its first Sound (`ctx.segmentWord(word)[0]`) puts it in that basket and records
`(firstSound, true)`. The wrong basket springs it back and records `(firstSound, false)`,
with shake and encourageRetry. The Game ends when every word is sorted.

## Lead update (applies to every kind)
- Audio can now be sequenced: `playAudio(id, onDone)`, `playAsset(id, onDone)` and
  `playQueue(ids, onDone)` (in `src/audio/play.ts`). Any new play cancels the queue
  that was playing. Use `GameShell`'s `onInstructed` to start the first round once
  the instruction has finished; don't guess with timers.
- `jest.setup.ts` now mocks `react-native-worklets` and `react-native-reanimated` for
  every test, so remove any per-file copies of those mocks.

## Kit v2 (after M2 review round 1) — supersedes the Lead update above
- **Audio always settles.** `playAudio/playAsset/playQueue(…, onSettled)` call
  `onSettled(interrupted)` exactly once however the clip ends (finished, interrupted,
  error, sound off). Advance your Game on it; a tap on Listen/Orto can no longer
  freeze a Game. An interrupted `playQueue` skips its remaining clips.
- **`GameShell` has no `onInstructed` prop any more.** Use `useSpeakEachRound(index,
  audioId | null)` to say each round's clip (round 0 waits for the instruction), and
  `useInstructed()` to ignore input until the instruction has been heard. GameShell
  stops all audio when the Game unmounts.
- **`useAnswers(onFinish)`** returns `{ record, finish }`. `finish()` is idempotent and
  a no-op after unmount, so delete your own `finished` refs.
- **`ChoiceButton`** (ref handle `pop()`/`shake()`, `dimmed`, `disabled`) is the tappable
  answer: wrap your LetterTile/PictureCard in it instead of your own Choice component.
- **`usePop()`** with the `feedback.popScale/popMs` tokens replaces every per-game pop.
  Delete your per-game pop tokens.
- **`useLatest(value)`** is the latest-value ref for gesture and audio callbacks.
- **`useGameArea()`** → `{ width, height, inset }` is the room a Game may use (window
  minus padding and Orto's bubble on both sides). Size every piece off it.
- **Drop zones** re-measure on every pick-up and unregister on unmount.
- **Lift z-order:** `Draggable` only beats its siblings. Give the piece's *container*
  `zIndex: drag.liftZ` while it's held (track it with `onPickUp`/`onDrop`), or render
  the source area last.
- **`useChoiceHandles()`** → `{ refFor(id), get(id) }` holds ChoiceButton handles per
  answer: `<ChoiceButton ref={refFor(id)} …>`, then `get(id)?.pop()`.
- Every Game ignores input until `useInstructed()` is true (gate gestures with
  `.enabled(instructed)`, not with early returns that swallow one-shot state).
