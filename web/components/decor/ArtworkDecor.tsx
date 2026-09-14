import type { ComponentType, CSSProperties } from "react";
import Tree from "@/components/decor/Tree";
import DistantTrees from "@/components/decor/DistantTrees";
import { YellowFlower, WhiteTrioFlower, LilacPetal } from "@/components/decor/Flower";

export interface DecorPlacement {
  Art: ComponentType<{ className?: string; style?: CSSProperties }>;
  left: string;
  top: string;
  width: string;
}

/**
 * Tree and flower decor placed on the "Skill Journey Artwork" frame shared by
 * the register-child background (node 1218:13207) and the landing redesign
 * (node 1360:8563). Both frames put these at identical coordinates, stated
 * here as percentages of the 1440x1202 artwork so they land on the same hill
 * features in either scene's artwork box. Scene-specific extras (register's
 * pair flower, landing's second lilac petal) stay in each scene.
 */
export const ARTWORK_TREES: DecorPlacement[] = [
  { Art: Tree, left: "88.889%", top: "54.243%", width: "6.024%" },
  { Art: Tree, left: "93.193%", top: "58.15%", width: "5.368%" },
  { Art: DistantTrees, left: "5.972%", top: "44.593%", width: "14.887%" },
];

export const ARTWORK_FLOWERS: DecorPlacement[] = [
  { Art: YellowFlower, left: "14.167%", top: "80.616%", width: "6.076%" },
  { Art: WhiteTrioFlower, left: "59.431%", top: "66.639%", width: "4.781%" },
  { Art: LilacPetal, left: "8.889%", top: "61.065%", width: "3.01%" },
];

export function DecorItems({ items }: { items: DecorPlacement[] }) {
  return (
    <>
      {items.map(({ Art, left, top, width }, i) => (
        <Art key={i} className="h-auto" style={{ left, top, width }} />
      ))}
    </>
  );
}

// The blurred white "card-pointer" glint (node 1218:13228 / 1360:8582).
export function ArtworkGlint() {
  return (
    <div
      aria-hidden="true"
      className="absolute rotate-45 bg-white"
      style={{ left: "31.16%", top: "12.665%", width: "2.828%", aspectRatio: "1 / 1", filter: "blur(8px)" }}
    />
  );
}
