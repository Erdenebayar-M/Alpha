import type { CSSProperties } from "react";

/** A layer's pixel box within some fixed-size parent, in the parent's own local coordinate space. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts a `Box` measured in a fixed-size parent's pixels into percentage
 * `left`/`top`/`width`/`height`, so an absolutely-positioned layer scales
 * with its parent instead of needing a matching literal pixel size. Shared
 * by FeaturedArticleArt and ArticleCard — both position illustration layers
 * that were hand-placed in Figma against a fixed-size panel.
 */
export function boxStyle(box: Box, parentWidth: number, parentHeight: number): CSSProperties {
  return {
    left: `${(box.x / parentWidth) * 100}%`,
    top: `${(box.y / parentHeight) * 100}%`,
    width: `${(box.width / parentWidth) * 100}%`,
    height: `${(box.height / parentHeight) * 100}%`,
  };
}
