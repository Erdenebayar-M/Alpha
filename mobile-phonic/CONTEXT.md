# Orto phonics game (mobile-phonic/)

An iOS-first Expo app that teaches pre-reading and early-reading children (about
4–8, preschool to early elementary) to hear, read and build Mongolian Cyrillic
words sound by sound. Inspired by Phonics Hero. Standalone app: not an npm
workspace, no backend in v1 (ADR 0001). Store name **"Orto: Авиа"**, home-screen
name **"Orto"**, bundle `com.erdenebayar.phonic`, landscape only, iPad + iPhone.

## Language

**Sound** (Авиа):
The unit the game teaches — a phoneme, voiced as its sound ("ммм"), never as its
letter name ("эм"). Each Sound is written by one **Grapheme**.
_Avoid_: Letter (when the spoken unit is meant), phoneme in child-facing copy

**Grapheme**:
The written form of a Sound: one letter (м) or a fixed pair (аа, ай). Long vowels
and diphthongs are Graphemes of their own, introduced in World 3.

**World** (Ертөнц):
One stage of the **Learning path**, set in one landscape (steppe, mountains, Gobi,
forest, city) and hosted by one character. Five in total; v1 ships World 1 only.

**Level** (Түвшин):
One node on a World's map. Introduces exactly one new Sound (or, in World 5, one
new word pattern) and contains 3–5 **Games**. Levels unlock in order.

**Learning path**:
The fixed order of Worlds and Levels (ADR 0002). Not chosen by the child and not
generated at runtime; the only adaptivity is the **Weak-sound remix**.

**Game** (Тоглоом):
One ~60-second mini-game inside a Level, of one **Game kind**. Scored in Stars.

**Game kind**:
The mechanic a Game uses, mapped to one renderer in the game registry (ADR 0003):
`hear-tap`, `trace`, `build-word`, `blend-pick`, `sort`. (`harmony-sort` is v1.1.)
_Avoid_: Exercise, Task (those belong to the orthography app in `mobile/`)

**Star** (Од):
0–3 per Game, from mistakes made. A Level's Stars is the sum of its Games' best
Stars. A Level is **Complete** once every Game has at least 1 Star, which unlocks
the next Level (ADR 0004).

**Sound accuracy**:
Per-Profile, per-Sound record of correct vs. attempted answers across all Games.
Drives the Weak-sound remix and the parent view.

**Weak-sound remix**:
When a Level builds its Games, it swaps some review items for Sounds whose Sound
accuracy is lowest. The only adaptive behaviour in v1.

**Sticker** (Наалт):
The collectible each Complete Level awards into the **Sticker book**. Stickers are
Mongolian animals/objects and the hosting characters. No coins, no shop in v1.

**Profile**:
One child on the device — avatar only, no typed name. At most 4. All progress
belongs to a Profile.

**Parental gate**:
The adult check in front of the parent area, settings and any link out (App Store
Kids-category rule).

**Decodable**:
A word is decodable in World *n* when every Grapheme in it is taught at or before
World *n*. Every word a Game uses must be decodable at its Level.

**Approved word**:
A word that comes from the backend `Word` table (master content bank) or that the
owner has approved. Drafted words are marked unapproved and never ship (ADR 0002).

**Asset ID**:
The stable key (`ph_m`, `ins_trace`, `fb_good_1`, `w_<word>`, `chr_orto_cheer`)
every image and audio clip is looked up by through the asset manifest (ADR 0005).

## Characters

- **Orto** — the guide: speaks every instruction, celebrates, lives on every screen.
- **Narhan**, **Sprout**, **Buddy** — host a World each on its map, and appear as Stickers.

Art is reused from `web/public/images/landing/` and `mobile/assets/characters/`.
Missing poses are pulled from Figma `ahVCzzSLccRd0vOVLFiEKg` or built from layered
parts, and listed as `TODO-art` in the manifest.

## Out of scope for v1

Backend sync, accounts, coin shop, `harmony-sort`, loan letters (ф к ц щ ъ ь),
Worlds 2–5 content (engine supports them), Android release, any analytics SDK.
