# /landing-new rows line up on one Content column, overriding Figma's per-frame x positions

Figma's landing frame hand-places each row, so at the 1440px design width the
page has five different left edges:

| Figma node                  | span at 1440   | width | centred on |
| --------------------------- | -------------- | ----- | ---------- |
| Header `1360:8937`          | 80 → 1360      | 1280  | 720        |
| `Layout` `1360:8704`        | 150 → 1289     | 1139  | 719.5      |
| Hero Card `1360:8705`       | 160 → 1279     | 1119  | 719.5      |
| Diagnostic card `1401:21880`| 156 → 1271     | 1115  | **713.5**  |
| Pills row `1360:8718`       | 184.5 → 1254.5 | 1070  | 719.5      |

`Layout` is the real container — the hero card and the pills row are both
centred inside it, at symmetric 10px and 34.5px insets. But `Layout`'s own
gutters are 150 left and 151 right, and the diagnostic card isn't its child at
all: it's a sibling, 6px off the shared centre line. Three visible rows, three
widths, no shared edge.

Reproducing those numbers faithfully — which `AGENTS.md` otherwise requires,
and which the first implementation of each row did — gives a page whose rows
step in and out by up to 34px against each other. That reads as a defect on
screen, and it gets worse with every section added, because each new one
inherits whatever x its own frame happens to carry.

Decided that **one Content column governs every content row**: 1140px wide and
centred, i.e. 150px gutters at 1440px, implemented as
`components/ui/Container.tsx`. 1140 is `Layout` squared up — its 150/151
gutters are a hand-placement error, and a container that isn't centred is a bug
that every future row would inherit. The column stays a *percentage* of the
viewport (79.16667%) rather than a fixed max-width, because every section here
expresses its geometry as a fraction of the 1440px reference and scales down
together between `lg` and 1440px; a fixed-px column would invalidate all of
that interior math.

What each row snaps to it is its **leftmost painted pixel**, not its Figma
frame. This matters because the rows aren't the same kind of object: the pills
row and the diagnostic card are boxes, whose surfaces start at the column edge,
but the hero is bare text on the sky — its Figma "Hero Card" frame is invisible,
so honouring that frame's 40px inset would leave the h1 41px adrift of the
alignment while nothing on screen explained why. The h1 therefore moves from
x=200 to x=150. That 50px shift is the largest visual deviation from Figma on
the page, and it is deliberate.

Consequences to expect when diffing against Figma: the hero art's right edge
moves 1299 → 1290 (in Figma it overflows its own container by 10px), the pills
row grows 1070 → 1140 with pills at 277px instead of 260px, and the diagnostic
card grows 1115 → 1140, scaling its interior by 2.24% so the proportions stay
Figma's. One knock-on inside the card: its aspect floor (410.4px) now exceeds
its content height (408.6px), so Figma's deliberate 3.5px overhang of the CTA
past the card's bottom edge disappears and the button lands just inside.

Anyone measuring a row against Figma will find it 20–70px "wrong" and be
tempted to put it back. Don't — the rows are correct relative to each other,
which is the property being defended.
