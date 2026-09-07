import Image from "next/image";
import { cn } from "@/lib/cn";
import type { TaskImage } from "@/lib/diagnostic-tasks";

interface TaskIllustrationProps {
  image: TaskImage;
  /** The frame: size, radius and border, which Figma varies per exercise. */
  className: string;
  sizes: string;
  /** Set on an exercise's single main illustration: the task card only mounts
   *  when its exercise is the one on screen, so that image is always in view
   *  immediately and is the step's LCP element — the one case AGENTS.md's asset
   *  rules exempt from lazy loading. Left off exercise 7's three small pair
   *  pictures, which would otherwise preload three images for one screen. */
  priority?: boolean;
}

/**
 * A task card's illustration in its fixed frame. Every one of these frames is
 * `object-cover` in the design, so the box is authoritative and the art is
 * cropped to it — which is why `fill` is used rather than intrinsic sizing.
 *
 * These are the one asset class that earns raster + next/image under
 * AGENTS.md's cost hierarchy: they are full illustrations, not geometry, and
 * the source files run to hundreds of KB apiece.
 */
export default function TaskIllustration({ image, className, sizes, priority }: TaskIllustrationProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden", className)}>
      <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
