import { useMemo } from "react";
import { Group, Line, Rect } from "react-konva";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { computeFrames, useFrameStore, type Frame } from "@/store/useFrameStore";
import { useImageStore } from "@/store/useImageStore";
import { useNormalizeStore } from "@/store/useNormalizeStore";

export function NormalizeOverlay() {
  const { enabled, showBaselines, config } = useNormalizeStore();
  const { mode, config: gridConfig } = useGridStore();
  const { frames: manualFrames } = useFrameStore();
  const { detectedFrames } = useAutoDetectStore();
  const { viewport } = useImageStore();
  const frames: Frame[] = useMemo(() => mode === "manual" ? manualFrames
    : mode === "auto" ? detectedFrames.map((frame, index) => ({ id: `auto-${index}`, ...frame }))
      : computeFrames(gridConfig), [mode, manualFrames, detectedFrames, gridConfig]);

  if (!enabled) return null;

  const anchorY = config.anchor === "center" ? 0.5
    : config.anchor === "custom" ? config.customAnchorY : 1;

  return <>
    {frames.map((frame) => {
      const baselineY = frame.y + frame.h * anchorY;
      return <Group key={frame.id}>
        <Rect x={frame.x} y={frame.y} width={config.targetW} height={config.targetH}
          stroke="#38bdf8" strokeWidth={1.5 / viewport.scale} dash={[6 / viewport.scale, 4 / viewport.scale]}
          fill="rgba(0,0,0,0)" listening={false} />
        {showBaselines && <Line points={[frame.x, baselineY, frame.x + config.targetW, baselineY]}
          stroke="rgba(239,68,68,0.7)" strokeWidth={1 / viewport.scale} listening={false} />}
      </Group>;
    })}
  </>;
}
