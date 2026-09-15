# Hero cloud reproduced as an exported SVG, not a CloudShape.tsx blur-blob

The landing hero's cloud (Figma node `1360:8712`, "Union") is a boolean union
of 4 ellipses with a diagonal gradient, drop shadow, and inner highlight —
not the single flat-fill, CSS-blurred ellipse that `CloudShape.tsx` and every
other cloud on this site is built from. The original implementation tried to
fit it into that same pattern (4 flat-colour `div`s, each blurred), matching
the sky clouds' established technique. That produced a diffuse, edgeless
colour smear instead of a cloud silhouette: `CloudShape.tsx`'s technique only
holds up for a shape that's opaque before the blur touches its edge — this
shape's boundary *is* the visual, so blurring it away destroyed the one thing
that made it read as a cloud (and, downstream, made the characters sitting
"on" it look like they were floating outside it instead).

Decided to render this cloud from its actual exported SVG asset
(`public/images/landing/hero-cloud.svg`) instead: it's a genuine 4-lobe
vector illustration with a real gradient and layered shadows, not simple
geometry, so it falls under the "SVG for illustrations" tier of the asset
strategy rather than the "CSS for simple geometry" tier `CloudShape.tsx`
occupies. Anyone reaching for `CloudShape.tsx`'s pattern here again will hit
the same edgeless-smear failure — this is deliberate, not an oversight.
