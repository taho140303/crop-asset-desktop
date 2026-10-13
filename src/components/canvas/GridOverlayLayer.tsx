import React from "react";
import { Layer } from "react-konva";
import type { GridFrame } from "@/types/grid";
import { GridFrameItem } from "./GridFrameItem";

interface GridOverlayLayerProps {
  frames: GridFrame[];
  selectedFrameIds: string[];
  hoveredFrameId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelectFrame: (id: string, multiSelect: boolean) => void;
  onHoverFrame: (id: string | null) => void;
}

export const GridOverlayLayer = React.memo(function GridOverlayLayer({
  frames,
  selectedFrameIds,
  hoveredFrameId,
  scale,
  offsetX,
  offsetY,
  onSelectFrame,
  onHoverFrame,
}: GridOverlayLayerProps) {
  const selectedSet = React.useMemo(
    () => new Set(selectedFrameIds),
    [selectedFrameIds]
  );

  return (
    <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
      {frames.map((frame) => (
        <GridFrameItem
          key={frame.id}
          frame={frame}
          isSelected={selectedSet.has(frame.id)}
          isHovered={hoveredFrameId === frame.id}
          scale={scale}
          onSelect={onSelectFrame}
          onHover={onHoverFrame}
        />
      ))}
    </Layer>
  );
});
