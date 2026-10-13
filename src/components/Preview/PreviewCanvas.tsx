import { useEffect, useRef } from "react";
import { normalizeFrame } from "@/lib/normalizeFrame";
import type { Frame } from "@/store/useFrameStore";
import type { NormalizeConfig } from "@/store/useNormalizeStore";

interface PreviewCanvasProps {
  sourceImage: HTMLImageElement | null;
  current: Frame | null;
  previous: Frame | null;
  next: Frame | null;
  onionSkin: boolean;
  normalizeEnabled: boolean;
  normalizeConfig: NormalizeConfig;
}

const PREVIEW_SIZE = 256;

function renderLetterboxed(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  alpha = 1
) {
  if (sourceWidth <= 0 || sourceHeight <= 0) return;
  const scale = Math.min(PREVIEW_SIZE / sourceWidth, PREVIEW_SIZE / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const x = (PREVIEW_SIZE - width) / 2;
  const y = (PREVIEW_SIZE - height) / 2;
  context.globalAlpha = alpha;
  context.drawImage(source, x, y, width, height);
  context.globalAlpha = 1;
}

export function PreviewCanvas({ sourceImage, current, previous, next, onionSkin, normalizeEnabled, normalizeConfig }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.imageSmoothingEnabled = false;
    if (!sourceImage || !current) return;

    const makeFrameCanvas = (frame: Frame) => {
      const result = document.createElement("canvas");
      result.width = PREVIEW_SIZE;
      result.height = PREVIEW_SIZE;
      const resultContext = result.getContext("2d");
      if (!resultContext) return result;
      resultContext.imageSmoothingEnabled = false;
      if (normalizeEnabled) {
        const normalized = normalizeFrame(frame, sourceImage, normalizeConfig);
        renderLetterboxed(resultContext, normalized.normalizedCanvas, normalized.normalizedCanvas.width, normalized.normalizedCanvas.height);
      } else {
        const width = Math.max(1, frame.w);
        const height = Math.max(1, frame.h);
        const scale = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
        const destW = width * scale;
        const destH = height * scale;
        const destX = (PREVIEW_SIZE - destW) / 2;
        const destY = (PREVIEW_SIZE - destH) / 2;
        try {
          resultContext.drawImage(sourceImage, frame.x, frame.y, frame.w, frame.h, destX, destY, destW, destH);
        } catch {
          // An unavailable source rectangle leaves the preview transparent.
        }
      }
      return result;
    };

    const drawOnion = (frame: Frame | null, tint: "rgba(255,0,0,0.8)" | "rgba(0,96,255,0.8)") => {
      if (!frame) return;
      const layer = makeFrameCanvas(frame);
      const layerContext = layer.getContext("2d");
      if (!layerContext) return;
      layerContext.globalCompositeOperation = "source-atop";
      layerContext.fillStyle = tint;
      layerContext.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      layerContext.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.25;
      context.drawImage(layer, 0, 0);
      context.globalAlpha = 1;
    };

    if (onionSkin) {
      drawOnion(previous, "rgba(255,0,0,0.8)");
      drawOnion(next, "rgba(0,96,255,0.8)");
    }
    const currentCanvas = makeFrameCanvas(current);
    context.globalAlpha = 1;
    context.drawImage(currentCanvas, 0, 0);
  }, [sourceImage, current, previous, next, onionSkin, normalizeEnabled, normalizeConfig]);

  return <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE}
    className="h-64 w-64 border border-border bg-zinc-950" aria-label="Animation preview canvas" />;
}
