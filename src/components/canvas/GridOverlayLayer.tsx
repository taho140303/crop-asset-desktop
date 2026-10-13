import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { useImageStore } from "@/store/useImageStore";
import { GridFrameItem } from "./GridFrameItem";
import { GridFrame } from "@/types/grid";

interface GridOverlayLayerProps {
  onSelectFrame: (id: string, multiSelect: boolean) => void;
}

export function GridOverlayLayer({ onSelectFrame }: GridOverlayLayerProps) {
  const {
    mode,
    selectedFrameIds,
    hoveredFrameId,
    setHoveredFrame,
    getFrames,
  } = useGridStore();

  const { viewport } = useImageStore();
  const { detectedFrames } = useAutoDetectStore();

  // If auto mode, render detected bboxes as frames
  let framesToRender: GridFrame[] = [];
  if (mode === "auto") {
    framesToRender = detectedFrames.map((f, i) => ({
      id: `auto-${i}`,
      index: i,
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
    }));
  } else {
    framesToRender = getFrames();
  }

  return (
    <>
      {framesToRender.map((frame) => {
        const isSelected = selectedFrameIds.includes(frame.id);
        const isHovered = hoveredFrameId === frame.id;

        return (
          <GridFrameItem
            key={frame.id}
            frame={frame}
            isSelected={isSelected}
            isHovered={isHovered}
            scale={viewport.scale}
            onSelect={onSelectFrame}
            onHover={(id) => setHoveredFrame(id)}
          />
        );
      })}
    </>
  );
}
