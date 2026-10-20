# All art and audio is looked up by Asset ID through one manifest

Code never imports an image or audio file directly; it asks the manifest for an Asset ID (`ph_m`, `ins_trace`, `fb_good_1`, `w_<word>`, `chr_orto_cheer`). Audio is recorded by the owner (see `content/RECORDING.md`); until a clip arrives, the manifest points its ID at a TTS placeholder. Characters reuse the existing Orto, Narhan, Sprout and Buddy art; missing poses are marked `TODO-art`.

This lets real recordings and art replace placeholders by swapping files, with no code change, and gives one place to see what is still missing.

## Consequences

- A manifest check lists every placeholder and `TODO-art` entry; the release build fails while any remain.
- Instructions are audio only, so the child never needs to read UI text.
