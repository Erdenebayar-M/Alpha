# Sound-first, decodable Learning path over five Worlds

The game teaches Sounds, not letter names ("м" is voiced "ммм"), in a fixed order chosen so a child can blend real words as early as possible:

1. World 1 — а о у э ө ү и + м н л с
2. World 2 — б г д р х т ш з ж ч
3. World 3 — long vowels (аа оо уу ээ өө үү ий) and diphthongs (ай ой уй үй эй)
4. World 4 — е ё ю я й ы
5. World 5 — two-syllable words, phrases, short sentences

Loan-only letters (ф к ц щ ъ ь) are out of v1. Every word a Game uses must be Decodable at its Level; content validation fails the build otherwise.

Words come from the backend `Word` table (seeded from the master content bank), filtered by decodability. Gaps are filled with drafted words flagged `approved: false`; the release build refuses any unapproved word. This keeps the root Hard Rule "never invent seed words" while letting development run before the list is final.

## Consequences

- Traditional Mongol script is not taught; adding it would be a new Learning path, not a World.
- Changing the Sound order means re-checking every word's decodability, which the validator does.
