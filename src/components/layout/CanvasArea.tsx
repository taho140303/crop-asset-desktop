import { useEffect, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";

export function CanvasArea() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <main ref={ref} className="relative min-w-0 flex-1 overflow-hidden bg-zinc-950">
      {size.width > 0 && (
        <Stage width={size.width} height={size.height}>
          <Layer>
            <Rect x={0} y={0} width={size.width} height={size.height} fill="#09090b" />
          </Layer>
        </Stage>
      )}
    </main>
  );
}
