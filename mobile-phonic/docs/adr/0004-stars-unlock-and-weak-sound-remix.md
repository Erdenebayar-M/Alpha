# Stars unlock Levels; Sound accuracy drives a light remix

Each Game scores 0–3 Stars from mistakes. A Level is Complete when every Game has at least 1 Star; that unlocks the next Level and awards a Sticker. Replaying keeps the best Stars. Separately, every answer updates the Profile's Sound accuracy, and when a Level builds its Games it swaps some review items for the Profile's weakest Sounds.

We rejected a full adaptive mastery model: it needs tuning data we do not have, and children of this age need a predictable "next node" on the map. A coin economy and shop were deferred to v1.1; a Sticker collection motivates 4–6-year-olds without balancing.

## Consequences

- Star, unlock and remix rules are pure functions with unit tests (TDD).
- The parent view reads Stars, mastered Sounds and weak Sounds from the same store.
