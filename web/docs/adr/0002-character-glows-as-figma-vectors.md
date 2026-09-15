# Hero character glows are Figma's exported vectors, layered under trimmed PNGs

The hero's two characters are raster PNGs, because Figma bakes an opaque page
background into every export of those nodes. Their soft edges, ORto's
pink/lavender halo (`bg_glow`, `1435:8876`) and Нархан's blurred body fill
(Ellipse 13, `1360:8743`), plus ORto's ground shadow (Ellipse 40, `1360:8799`),
don't survive that. Removing the background leaves a hard ring, and trying to
recover real transparency from the pixels (a minimum-alpha unmatte) gets the
right result over the flat background but makes the pale glows almost vanish
once they sit on the cloud. There isn't enough information in one flattened
export to recover a pale, semi-transparent glow.

Decided to render those three soft layers from Figma's own exported SVGs
(`public/images/landing/hero-*-glow.svg`, `hero-orto-shadow.svg`), in Figma's
paint order with Figma's own rotate/skew, and to cut each PNG's baked glow away
so only the vector glow shows: ORto's at his body circle, Нархан's just inside
her unblurred body outline (Ellipse 12). If the characters are re-exported, don't
fold the glows back into the PNGs, and don't try to clean them up in the pixels
again. Re-export the PNGs and redo the trim against those outlines instead.
