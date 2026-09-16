import CollectionsScroller from "@/components/sections/CollectionsScroller";
import CollectionCard, { type CollectionCardArt } from "@/components/ui/CollectionCard";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { collectionsRow } from "@/lib/content";

// Per-card art (icon + decoration asset paths/geometry) isn't copy, so it's
// kept here rather than in lib/content.ts — the same split ArticlesGrid's
// own local `art` config draws, zipped to collectionsRow.items by index.
// Typed as an exact 5-tuple, matching collectionsRow.items's own 5-tuple
// type (lib/content.ts), so an added/removed card in one file without the
// other fails to typecheck rather than reading past the end of a shorter
// array at render.
//
// Cards 3 and 5 (both "Зөв үсэглэх") share the same icon (image 136, the
// "ABC" export) — Figma's own node tree reuses it for both, consistent with
// the ticket's instruction to keep the shared title rather than inventing a
// second icon for it.
//
// Decoration boxes/transforms are pixel-matched against Figma's own
// generated code for node 1401:22290 (get_design_context, forceCode): each
// decoration's outer box there is Figma's already-computed *rotated*
// bounding box, centred over the un-rotated asset — so the boxes below use
// each exported SVG's own natural size, centred on that same point, with
// the matching rotate()/skewX()/scaleY() transform layered on top.
const art: readonly [
  CollectionCardArt,
  CollectionCardArt,
  CollectionCardArt,
  CollectionCardArt,
  CollectionCardArt,
] = [
  {
    icon: { src: "/images/landing/collection-icon-book.png", width: 90, height: 90 },
    decorations: [
      {
        src: "/images/landing/collection-petal-1.svg",
        box: { x: -0.4, y: 235.82, width: 29.581, height: 25.426 },
        transform: "rotate(117.19deg)",
      },
      {
        src: "/images/landing/collection-petal-2.svg",
        box: { x: 114.38, y: 244.64, width: 27.4033, height: 26.7819 },
        transform: "rotate(117.19deg)",
      },
      {
        src: "/images/landing/collection-petal-3.svg",
        box: { x: 208.74, y: 241.21, width: 37.856, height: 31.6388 },
        transform: "rotate(117.19deg)",
      },
    ],
  },
  {
    icon: { src: "/images/landing/collection-icon-pencil.png", width: 62, height: 62 },
    decorations: [
      { src: "/images/landing/collection-flower-a.svg", box: { x: 51, y: 230.5, width: 17.769, height: 15.084 } },
      { src: "/images/landing/collection-flower-b.svg", box: { x: 119, y: 239.5, width: 17.78, height: 15.084 } },
      {
        src: "/images/landing/collection-grass.svg",
        box: { x: 195.22, y: 213.29, width: 76.2156, height: 72.3905 },
        transform: "rotate(26.79deg)",
      },
    ],
  },
  {
    icon: { src: "/images/landing/collection-icon-abc.png", width: 73, height: 74 },
    decorations: [
      {
        src: "/images/landing/collection-vector.svg",
        box: { x: 6.36, y: 243.52, width: 15, height: 13.495 },
        transform: "rotate(-13.13deg) skewX(0.22deg)",
      },
      {
        src: "/images/landing/collection-vector.svg",
        box: { x: 137.49, y: 253.1, width: 15, height: 13.495 },
        transform: "rotate(35.03deg) skewX(0.22deg)",
      },
      {
        src: "/images/landing/collection-vector.svg",
        box: { x: 223, y: 248.03, width: 15, height: 13.495 },
        transform: "rotate(0.21deg) skewX(0.21deg)",
      },
    ],
  },
  {
    icon: { src: "/images/landing/collection-icon-parents.png", width: 78, height: 78 },
    decorations: [
      {
        src: "/images/landing/collection-grass-flip.svg",
        box: { x: -7.78, y: 232.29, width: 76.2156, height: 72.3905 },
        transform: "rotate(153.21deg) scaleY(-1)",
      },
      { src: "/images/landing/collection-flower-b.svg", box: { x: 191, y: 235, width: 17.78, height: 15.084 } },
      { src: "/images/landing/collection-flower-b.svg", box: { x: 33, y: 232, width: 17.78, height: 15.084 } },
      {
        src: "/images/landing/collection-grass.svg",
        box: { x: 141.22, y: 204.29, width: 76.2156, height: 72.3905 },
        transform: "rotate(26.79deg)",
      },
    ],
  },
  {
    icon: { src: "/images/landing/collection-icon-abc.png", width: 73, height: 74 },
    decorations: [
      { src: "/images/landing/collection-flower-a.svg", box: { x: 51, y: 230.5, width: 17.769, height: 15.084 } },
      { src: "/images/landing/collection-flower-b.svg", box: { x: 119, y: 239.5, width: 17.78, height: 15.084 } },
      { src: "/images/landing/collection-flower-b.svg", box: { x: 191, y: 237.5, width: 17.78, height: 15.084 } },
    ],
  },
];

/**
 * /landing-new's Collections row (Figma node 1401:22290, "Frame 94"), the
 * page's final section — five Collection cards (see web/CONTEXT.md's
 * Collection entry) a parent can browse by theme. One `CollectionCard`
 * component, five cards from one data array (`collectionsRow.items` zipped
 * with the `art` config above), per the root "don't hand-write the same
 * structure twice" rule.
 *
 * The row scrolls natively (`overflow-x-auto` + `snap-x`) rather than being
 * squeezed to fit the Content column: Figma's own row (1356px of cards) is
 * already wider than the column (1140px at 1440px), so the fifth card
 * partly hangs off the right edge at rest — exactly the "peek" Figma shows,
 * for free, as long as the cards keep their literal Figma pixel size
 * (CollectionCard) instead of shrinking to fit. `py-1` on the scroll
 * container reserves room for each card's own focus ring so it isn't
 * clipped top/bottom by the container's own scroll clipping (the ring is
 * still clipped left/right at the scroll extremes, the same trade-off any
 * native horizontal carousel makes).
 *
 * The scroll container is also `tabIndex={0}` with an accessible name (on
 * top of every card already being its own focusable link), so a keyboard
 * user can either arrow/Page-scroll the region directly or Tab through the
 * cards one at a time (the browser scrolls the container into view as each
 * card receives focus either way) — either path satisfies "reachable and
 * scrollable by keyboard".
 *
 * The scroll region and its optional prev/next buttons (issue #93, a
 * follow-up to #73) live in `CollectionsScroller` — the only Client
 * Component in this section, since the buttons need to read and drive the
 * scroll container's state. The cards themselves stay server-rendered here
 * and are passed straight through as `children`.
 */
export default function CollectionsRow() {
  return (
    <section aria-labelledby="collections-row-heading" className="landing-section-gap-b">
      <Container className="flex flex-col gap-6 lg:gap-[30px]">
        <SectionHeading id="collections-row-heading">{collectionsRow.heading}</SectionHeading>

        <CollectionsScroller
          headingId="collections-row-heading"
          prevLabel={collectionsRow.prevLabel}
          nextLabel={collectionsRow.nextLabel}
        >
          {collectionsRow.items.map((card, index) => (
            <CollectionCard key={index} card={card} art={art[index]} />
          ))}
        </CollectionsScroller>
      </Container>
    </section>
  );
}
