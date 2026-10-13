import type { Frame } from "@/store/useFrameStore";
import type { NormalizeConfig } from "@/store/useNormalizeStore";

export interface SpriteSourceSize {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NormalizeFrameResult {
  normalizedCanvas: HTMLCanvasElement;
  sourceSize: { w: number; h: number };
  spriteSourceSize: SpriteSourceSize;
  error?: "FRAME_TOO_LARGE" | "IMAGE_READ_FAILED";
  aspectMismatch: boolean;
  isEmpty: boolean;
}

const resultCache = new WeakMap<HTMLImageElement, Map<string, NormalizeFrameResult>>();
const scratchCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
const MAX_CACHE_ENTRIES_PER_IMAGE = 512;

function bounded(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getConfigKey(config: NormalizeConfig) {
  const background = config.background === "transparent"
    ? "transparent"
    : [config.background.r, config.background.g, config.background.b, config.background.a];
  return JSON.stringify({ ...config, background });
}

function getResultCanvas(source: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { canvas, context: null };
  const sourceCanvas = scratchCache.get(source);
  if (!sourceCanvas) scratchCache.set(source, document.createElement("canvas"));
  return { canvas, context };
}

function fillBackground(context: CanvasRenderingContext2D, config: NormalizeConfig, width: number, height: number) {
  context.clearRect(0, 0, width, height);
  if (config.background === "transparent") return;
  const { r, g, b, a } = config.background;
  context.fillStyle = `rgba(${bounded(Math.round(r), 255)}, ${bounded(Math.round(g), 255)}, ${bounded(Math.round(b), 255)}, ${bounded(a, 255) / 255})`;
  context.fillRect(0, 0, width, height);
}

/** Crop and optionally trim a frame, then pad it into a target-sized canvas. This never scales pixels. */
export function normalizeFrame(
  frame: Pick<Frame, "id" | "x" | "y" | "w" | "h">,
  sourceImage: HTMLImageElement,
  config: NormalizeConfig
): NormalizeFrameResult {
  const targetW = Math.max(1, Math.round(config.targetW));
  const targetH = Math.max(1, Math.round(config.targetH));
  const sourceW = Math.max(1, Math.round(frame.w));
  const sourceH = Math.max(1, Math.round(frame.h));
  const cacheKey = JSON.stringify([
    frame.id, Math.round(frame.x), Math.round(frame.y), sourceW, sourceH,
    getConfigKey(config),
  ]);
  let imageCache = resultCache.get(sourceImage);
  if (!imageCache) {
    imageCache = new Map();
    resultCache.set(sourceImage, imageCache);
  }
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const { canvas: normalizedCanvas, context } = getResultCanvas(sourceImage, targetW, targetH);
  const sourceSize = { w: sourceW, h: sourceH };
  const emptySprite: SpriteSourceSize = { x: 0, y: 0, w: 0, h: 0 };
  if (!context) {
    return { normalizedCanvas, sourceSize, spriteSourceSize: emptySprite, error: "IMAGE_READ_FAILED", aspectMismatch: false, isEmpty: true };
  }
  fillBackground(context, config, targetW, targetH);

  const scratch = scratchCache.get(sourceImage)!;
  if (scratch.width !== sourceW || scratch.height !== sourceH) {
    scratch.width = sourceW;
    scratch.height = sourceH;
  }
  const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
  if (!scratchContext) {
    const result: NormalizeFrameResult = { normalizedCanvas, sourceSize, spriteSourceSize: emptySprite, error: "IMAGE_READ_FAILED", aspectMismatch: false, isEmpty: true };
    imageCache.set(cacheKey, result);
    return result;
  }
  scratchContext.clearRect(0, 0, sourceW, sourceH);
  try {
    scratchContext.drawImage(
      sourceImage,
      Math.round(frame.x), Math.round(frame.y), sourceW, sourceH,
      0, 0, sourceW, sourceH
    );
  } catch {
    const result: NormalizeFrameResult = { normalizedCanvas, sourceSize, spriteSourceSize: emptySprite, error: "IMAGE_READ_FAILED", aspectMismatch: false, isEmpty: true };
    imageCache.set(cacheKey, result);
    return result;
  }

  let trimX = 0;
  let trimY = 0;
  let cropW = sourceW;
  let cropH = sourceH;
  let isEmpty = false;

  if (config.trimFirst) {
    let pixels: ImageData;
    try {
      pixels = scratchContext.getImageData(0, 0, sourceW, sourceH);
    } catch {
      const result: NormalizeFrameResult = { normalizedCanvas, sourceSize, spriteSourceSize: emptySprite, error: "IMAGE_READ_FAILED", aspectMismatch: false, isEmpty: true };
      imageCache.set(cacheKey, result);
      return result;
    }
    let minX = sourceW;
    let minY = sourceH;
    let maxX = -1;
    let maxY = -1;
    const data = pixels.data;
    for (let y = 0; y < sourceH; y++) {
      let pixel = (y * sourceW) * 4 + 3;
      for (let x = 0; x < sourceW; x++, pixel += 4) {
        if (data[pixel] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      isEmpty = true;
      cropW = 0;
      cropH = 0;
    } else {
      trimX = minX;
      trimY = minY;
      cropW = maxX - minX + 1;
      cropH = maxY - minY + 1;
    }
  }

  const spriteSourceSize = { x: trimX, y: trimY, w: cropW, h: cropH };
  const aspectMismatch = cropW > 0 && cropH > 0 && Math.abs(cropW / cropH - targetW / targetH) > 0.0001;
  if (cropW > targetW || cropH > targetH) {
    const result: NormalizeFrameResult = { normalizedCanvas, sourceSize, spriteSourceSize, error: "FRAME_TOO_LARGE", aspectMismatch, isEmpty };
    imageCache.set(cacheKey, result);
    return result;
  }

  if (!isEmpty) {
    let dx: number;
    let dy: number;
    switch (config.anchor) {
      case "bottom-center":
        dx = (targetW - cropW) / 2;
        dy = targetH - cropH;
        break;
      case "bottom-left":
        dx = 0;
        dy = targetH - cropH;
        break;
      case "center":
        dx = (targetW - cropW) / 2;
        dy = (targetH - cropH) / 2;
        break;
      case "custom":
        dx = (targetW - cropW) * bounded(config.customAnchorX, 1);
        dy = (targetH - cropH) * bounded(config.customAnchorY, 1);
        break;
    }
    dx = Math.round(dx);
    dy = Math.round(dy);
    context.drawImage(scratch, trimX, trimY, cropW, cropH, dx, dy, cropW, cropH);
  }

  const result: NormalizeFrameResult = { normalizedCanvas, sourceSize, spriteSourceSize, aspectMismatch, isEmpty };
  if (imageCache.size >= MAX_CACHE_ENTRIES_PER_IMAGE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey !== undefined) imageCache.delete(oldestKey);
  }
  imageCache.set(cacheKey, result);
  return result;
}
