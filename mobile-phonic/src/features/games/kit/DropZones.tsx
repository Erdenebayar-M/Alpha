import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { hitTest, type Rect } from './hitTest';

interface DropZonesApi {
  /** Adds a zone's view (null removes it). */
  attach: (id: string, view: View | null) => void;
  /** Re-measures every zone. Draggable calls it on pick-up, so a drop always hits today's layout. */
  remeasure: () => void;
  zoneAt: (x: number, y: number) => string | null;
}

const Ctx = createContext<DropZonesApi | null>(null);

/** Wrap a Game that uses drag-and-drop; Draggables and DropZones inside it find each other. */
export function DropZonesProvider({ children }: { children: ReactNode }) {
  const views = useRef(new Map<string, View>());
  const rects = useRef(new Map<string, Rect>());

  const measure = useCallback((id: string, view: View) => {
    view.measureInWindow((x, y, width, height) => {
      // Ignore a late measurement for a zone that was removed meanwhile.
      if (views.current.get(id) === view) rects.current.set(id, { x, y, width, height });
    });
  }, []);

  const api = useMemo<DropZonesApi>(
    () => ({
      attach: (id, view) => {
        if (view) {
          views.current.set(id, view);
          measure(id, view);
        } else {
          views.current.delete(id);
          rects.current.delete(id);
        }
      },
      remeasure: () => views.current.forEach((view, id) => measure(id, view)),
      zoneAt: (x, y) => hitTest(rects.current, x, y),
    }),
    [measure],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDropZones(): DropZonesApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useDropZones must be used inside <DropZonesProvider>');
  return api;
}

interface DropZoneProps {
  id: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** A target area. Measured on layout and on every pick-up; removed when it unmounts. */
export function DropZone({ id, style, children }: DropZoneProps) {
  const { attach } = useDropZones();
  const ref = useRef<View>(null);
  useEffect(() => () => attach(id, null), [attach, id]);
  return (
    <View ref={ref} style={style} onLayout={() => attach(id, ref.current)}>
      {children}
    </View>
  );
}
