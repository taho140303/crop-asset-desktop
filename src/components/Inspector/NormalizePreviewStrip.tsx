import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { normalizeFrame, type NormalizeFrameResult } from "@/lib/normalizeFrame";
import { useFrameStore, type Frame } from "@/store/useFrameStore";
import { useNormalizeStore } from "@/store/useNormalizeStore";

interface NormalizePreviewStripProps {
  frames: Frame[];
  sourceImage: HTMLImageElement | null;
  onValidationChange: (exceeded: Frame[]) => void;
}

function thumbnailSize(width: number, height: number) {
  const scale = Math.min(1, 128 / width, 128 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function NormalizePreviewStrip({ frames, sourceImage, onValidationChange }: NormalizePreviewStripProps) {
  const { enabled, config } = useNormalizeStore();
  const selectFrame = useFrameStore((state) => state.selectFrame);
  const [results, setResults] = useState<Record<string, NormalizeFrameResult>>({});
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>());

  useEffect(() => {
    if (!enabled || !sourceImage) {
      setResults({});
      onValidationChange([]);
      return;
    }

    const timer = window.setTimeout(() => {
      const next: Record<string, NormalizeFrameResult> = {};
      for (const frame of frames) next[frame.id] = normalizeFrame(frame, sourceImage, config);
      const exceeded = frames.filter((frame) => next[frame.id]?.error === "FRAME_TOO_LARGE");
      setResults(next);
      onValidationChange(exceeded);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [enabled, frames, sourceImage, config, onValidationChange]);

  useEffect(() => {
    for (const frame of frames) {
      const result = results[frame.id];
      const canvas = canvasRefs.current.get(frame.id);
      if (!result || !canvas) continue;
      const { width, height } = thumbnailSize(result.normalizedCanvas.width, result.normalizedCanvas.height);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.drawImage(result.normalizedCanvas, 0, 0, width, height);
    }
  }, [frames, results]);

  if (!enabled) return null;

  return (
    <div className="mt-3 space-y-2" aria-label="Normalized frame previews">
      <div className="text-xs font-medium text-muted-foreground">Normalize Preview</div>
      {!sourceImage ? (
        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Open an image to preview normalized frames.</div>
      ) : frames.length === 0 ? (
        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">No frames to preview.</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {frames.map((frame, index) => {
            const result = results[frame.id];
            const size = result ? thumbnailSize(result.normalizedCanvas.width, result.normalizedCanvas.height) : thumbnailSize(config.targetW, config.targetH);
            const tooLarge = result?.error === "FRAME_TOO_LARGE";
            const label = frame.label?.trim() || frame.id;
            return (
              <button key={frame.id} type="button" onClick={() => selectFrame(frame.id)} title={tooLarge ? `${label}: exceeds target size` : label}
                className={`flex shrink-0 flex-col items-center gap-1 rounded border p-1.5 text-[10px] ${tooLarge ? "border-red-500 text-red-500" : "border-border hover:border-primary"}`}>
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="truncate">#{index + 1}</span>
                  {tooLarge && <AlertTriangle className="h-3 w-3 shrink-0" aria-label="Frame exceeds target" />}
                </span>
                <canvas ref={(canvas) => { if (canvas) canvasRefs.current.set(frame.id, canvas); else canvasRefs.current.delete(frame.id); }}
                  width={size.width} height={size.height} className={tooLarge ? "outline outline-1 outline-red-500" : ""} />
                <span className="max-w-28 truncate text-muted-foreground">{frame.label || frame.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
