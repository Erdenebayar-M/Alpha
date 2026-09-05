"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Wraps a card and flips data-visible once it enters the viewport. CSS (the
 *  [data-reveal] rules in globals.css) drives the actual animation; this only
 *  decides *when* to start it, then disconnects — no per-frame JS. */
export default function Reveal({ children, className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal data-visible={visible} style={style} className={className}>
      {children}
    </div>
  );
}
