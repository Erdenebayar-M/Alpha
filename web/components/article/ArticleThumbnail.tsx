import Image from "next/image";
import type { Thumbnail } from "@/lib/api/server/publicArticles";

interface ArticleThumbnailProps {
  thumbnail: Thumbnail;
  /** The `sizes` hint for the box this fills, which differs per card. */
  sizes: string;
}

/**
 * An Article's Thumbnail filling its (relatively positioned) card box, so the
 * card's shape is the same with or without one. Lazy-loaded — no Thumbnail is
 * the LCP element. Without staff-given alt text the image is decorative: the
 * card's link is already named by the Article's title.
 */
export default function ArticleThumbnail({ thumbnail, sizes }: ArticleThumbnailProps) {
  return (
    <Image
      src={thumbnail.src}
      alt={thumbnail.alt ?? ""}
      fill
      sizes={sizes}
      unoptimized={thumbnail.unoptimized}
      className="object-cover"
    />
  );
}
