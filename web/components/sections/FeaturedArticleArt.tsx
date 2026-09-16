import Image from "next/image";
import Mascot from "@/components/brand/Mascot";
import { type Box, boxStyle } from "@/lib/box";
import { featuredArticle } from "@/lib/content";

// The illustration panel's own tight box (node 1401:22065, "Rectangle 56"),
// 389x303 — everything below is positioned in this coordinate space, then
// converted to percentages (via boxStyle) so the whole illustration scales
// with the panel.
const PANEL_WIDTH = 389;
const PANEL_HEIGHT = 303;

// The mascot, cloud/word and book layers overlay the panel as a sibling group
// in Figma (node 1401:22076, "Group 103") rather than sitting inside it, so
// they don't chain cleanly onto the panel's own box through Figma's nested
// (and here ambiguous) group offsets. Positions below are instead pixel-
// matched directly against Figma's render of the section (1401:22062),
// re-based so the panel's own top-left is this file's origin.
const MASCOT_BOX: Box = { x: 45, y: 93, width: 200, height: 207 };
const CLOUD_BOX: Box = { x: 220, y: 24, width: 154, height: 126 };
const HONI_BOX: Box = { x: 245, y: 178, width: 58, height: 15 };
const ARROW_BOX: Box = { x: 245, y: 120, width: 42.709, height: 50.335 };
const BOOKS_BOX: Box = { x: 248, y: 203, width: 110, height: 71 };

function styleFor(box: Box) {
  return boxStyle(box, PANEL_WIDTH, PANEL_HEIGHT);
}

interface FeaturedArticleArtProps {
  className?: string;
}

/**
 * The Featured article's illustration (Figma node 1401:22076): ORto (the
 * brand mascot, reused rather than redrawn), the "хойн"/"хонь" word-cloud
 * pair with its connecting arrow (exported SVG — node 1401:22079's cloud
 * shape ships its own "хойн" label outlined as a path, so no extra font is
 * loaded for it), and the stack of books (the AI-generated raster export,
 * node 1401:22078). `role="img"` gives assistive tech one accessible name for
 * the whole composite; every layered piece inside is decorative.
 */
export default function FeaturedArticleArt({ className }: FeaturedArticleArtProps) {
  return (
    <div role="img" aria-label={featuredArticle.artLabel} className={className}>
      <div className="pointer-events-none relative size-full">
        <div className="absolute" style={styleFor(MASCOT_BOX)}>
          <Mascot decorative className="size-full" />
        </div>

        <div className="absolute" style={styleFor(CLOUD_BOX)}>
          <Image src="/images/landing/featured-cloud.svg" alt="" aria-hidden="true" fill />
        </div>
        <div className="absolute" style={styleFor(HONI_BOX)}>
          <Image src="/images/landing/featured-honi.svg" alt="" aria-hidden="true" fill />
        </div>
        <div className="absolute" style={styleFor(ARROW_BOX)}>
          <Image src="/images/landing/featured-arrow.svg" alt="" aria-hidden="true" fill />
        </div>
        <div className="absolute" style={styleFor(BOOKS_BOX)}>
          <Image src="/images/landing/featured-books.png" alt="" aria-hidden="true" fill sizes="150px" />
        </div>
      </div>
    </div>
  );
}
