# CLAUDE.md

> Context and rules for this project. Claude Code reads this automatically every
> session. Keep it short and current. Lines marked **TODO** are mine to fill in.

---

## What this project is

A mobile app that teaches the **Mongolian language to elementary school children**
(ages ~6–11), for use in Mongolian schools. Ships on the **Apple App Store and Google
Play**. The end user is a young child, often not yet a fluent reader.

## Who I am (the developer)

Experienced web developer — solid with **JavaScript, TypeScript, React, and Next.js**.
**New to React Native, Expo, and mobile/app-store development.** So:

- Skip JS/React/TS basics — I know those.
- **Do** flag React Native-, Expo-, mobile-, and app-store-specific gotchas and the
  places where web habits don't transfer (no DOM/CSS, flexbox defaults, dev builds,
  safe areas, platform differences, store review).
- Be direct and efficient. Explain non-obvious _mobile_ decisions, not fundamentals.
- Work in focused steps and keep changes minimal and scoped to what I asked.
- If I'm about to do something that's wrong for mobile/RN, say so and suggest better.

## Tech stack

- **React Native + Expo** (managed workflow)
- **TypeScript**
- **Expo Router** for navigation (file-based, similar to the Next.js App Router)
- **Styling:** `StyleSheet` + design tokens from `constants/theme.ts`.
  (NativeWind is an option if I decide I want Tailwind-style classes — TODO: decide.)
- **Animations:** Reanimated for simple motion; **Rive** for character animations
  (TODO: confirm Rive vs Lottie with the designer). Rive/Lottie need a **development
  build** and do **not** run in Expo Go.
- **No backend for core features.** The app works fully **offline** — all lessons,
  images, audio, and animations are bundled.

## Repo layout

This app lives in `mobile/` inside a larger repo. **Work only inside `mobile/`.**

```
project/
├── backend/    # separate service — DO NOT modify unless I explicitly ask
├── frontend/   # unused web folder — ignore it completely
└── mobile/     # THIS app — all your work happens here
```

Inside `mobile/`:

```
mobile/
├── app/                # screens (Expo Router)
├── components/         # reusable UI (buttons, cards, <Character/>)
├── assets/             # images, fonts, audio, .riv/.json animation files
├── constants/theme.ts  # design tokens — THE single source of truth
└── data/               # bundled lesson content (offline), typed
```

## Core principles — always follow

1. **Offline-first.** Everything works with no internet. No core feature depends on a
   network call.
2. **Privacy-minimal (kids' app).** Collect **no personal data**. **No ads, tracking, or
   analytics SDKs.** No external links without a parental gate.
3. **Design fidelity.** Match Figma. Every color, spacing, and font size comes from
   `constants/theme.ts` (mirrors Figma Dev Mode). **Never hardcode design values** in a
   component — reference the theme. Type the theme so misuse is a compile error.
4. **Both platforms.** Must run on **iOS and Android**. No platform-only API without a
   cross-platform fallback.
5. **Child-friendly UX.** Big tap targets, large text, simple navigation, audio cues.
   Design for a 6–9-year-old who may not read fluently.
6. **Mongolian text must render correctly.** Use the project's Mongolian font
   (TODO: font name) everywhere; never fall back to a system font that may drop glyphs.

## Styling rules

- All style values come from `constants/theme.ts`.
- Lay out with **Flexbox**, translating Figma Auto Layout → `flexDirection`,
  `justifyContent`, `alignItems`, `gap`, `padding`. Remember RN defaults
  `flexDirection` to `column`.
- **Never use absolute positioning** to copy Figma coordinates. Build responsive layouts.
- Reusable pieces go in `components/`, with typed props.

## Responsive sizing (look consistent across phone sizes)

Style values are density-independent **points**, not pixels — so a fixed `240` is roughly
the same *physical* size on every phone, but phones differ in **logical width and aspect
ratio**, so the same value is a bigger *proportion* of a small phone than a large one. That
drift is why screens look different across devices.

- **Goal is _proportional_, not pixel-identical.** Tall and short phones have different
  vertical space — you can't make them identical, only consistent.
- **Prefer flex for layout.** Use `flex`, `gap`, `justifyContent`, percentage widths
  (`'48%'`), and `marginTop: 'auto'` to absorb size/aspect-ratio differences automatically.
  Reach for fixed point values only for genuinely fixed-size art (the globe, icons).
- **Scale fixed sizes to screen width** off the Figma frame width (the design reference),
  via a `scale()` helper in `constants/theme.ts` — don't sprinkle raw magic numbers like
  `size={240}` or `minHeight: 112`:

  ```ts
  // constants/theme.ts
  import { Dimensions } from 'react-native';
  const GUIDELINE_WIDTH = 393; // Figma frame width — confirm in Dev Mode
  const { width } = Dimensions.get('window');
  export const scale = (size: number) => (width / GUIDELINE_WIDTH) * size;          // linear
  export const ms = (size: number, f = 0.5) => size + (scale(size) - size) * f;     // dampened (fonts/heights)
  ```

  Use `scale(...)` for widths/diameters, `ms(...)` for font sizes and min-heights. For
  apps that rotate or run on foldables use the `useWindowDimensions()` hook instead of the
  static `Dimensions.get` snapshot. (`react-native-size-matters` is the same idea as a dep —
  prefer the local helper unless you also need `verticalScale`.)
- **Always keep `SafeAreaView` / safe-area insets** so notches and home indicators never clip.
- **Test the extremes every time:** iOS iPhone SE (smallest) + 16 Pro Max (largest), and a
  small Android phone. If it's right on both ends, everything between is fine.

## Animation rules

- Simple motion (bounce, slide, scale, fade): **Reanimated**.
- Character animations: **Rive** (`.riv`) [or Lottie] — needs a development build.
- Wrap the mascot in one reusable, typed
  `<Character state="idle" | "correct" | "wrong" | "celebrate" />` component, so the rest
  of the app just sets a state.
- Don't hand-code complex character animation frame by frame.

## How we work together

- Keep changes **minimal and scoped**.
- **Don't install dependencies** without telling me what and why first; prefer
  `npx expo install` for native-affecting packages.
- **Don't run destructive commands** (`rm`, `git reset --hard`, force push) without asking.
- Commit small working pieces; never commit secrets, keys, or `node_modules`.
- Keep TypeScript strict — no `any` unless justified.

## Common commands

```bash
npx expo start            # start dev server (Expo Go)
npx expo install <pkg>    # add an Expo-compatible / native package
npx tsc --noEmit          # type-check
# Dev build (needed for Rive/Lottie):
# eas build --profile development --platform ios   (TODO: confirm once EAS is set up)
```

## Never do

- Never add ads, analytics, tracking, or anything collecting data about the child.
- Never hardcode design values — always use `theme.ts`.
- Never touch `backend/` or `frontend/`.
- Never use absolute positioning to mirror Figma pixel coordinates.

---

**TODO before coding in earnest:**

- [ ] Confirm Rive vs Lottie with the designer
- [ ] Decide StyleSheet vs NativeWind
- [ ] Add the Mongolian font name + files
- [ ] Fill `theme.ts` with real colors/spacing/typography from Figma
