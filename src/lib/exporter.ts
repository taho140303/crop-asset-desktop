import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import type { Frame } from "@/store/useFrameStore";
import { normalizeFrame, type SpriteSourceSize } from "@/lib/normalizeFrame";
import type { NormalizeConfig } from "@/store/useNormalizeStore";
import { packSpriteSheet, type PackedSheet, type SheetItem } from "@/lib/sheetPacker";

export type ExportFormat = "png-sequence" | "sprite-sheet" | "both";

export interface ExportConfig {
  outputDir: string | null;
  animName: string;
  format: ExportFormat;
  namingPattern: "{anim}_{index:02d}";
  perAnimFolder: boolean;
  exportMetadata: boolean;
  skipEmptyFrames: boolean;
  sheetPadding: number;
  sheetPowerOfTwo: boolean;
}

export interface ExportFrameArgs {
  frames: Frame[];
  sourceBitmap: ImageBitmap;
  normalizeEnabled: boolean;
  normalizeConfig: NormalizeConfig;
  exportConfig: ExportConfig;
  fps: number;
  loop: boolean;
}

export interface ExportProgressUpdate {
  current: number;
  total: number;
  phase: string;
}

export interface ExportError {
  frameId: string;
  message: string;
}

export interface ExportResult {
  outputPath: string;
  filesWritten: string[];
  exportedFrames: number;
  errors: ExportError[];
  warnings: string[];
  cancelled: boolean;
  progressCurrent: number;
  progressTotal: number;
}

export interface ExportFramesArgs extends ExportFrameArgs {
  onProgress: (current: number, total: number, phase: string) => void;
  signal: AbortSignal;
}

interface PreparedFrame {
  frame: Frame;
  index: number;
  key: string;
  fileName: string;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  sourceSize: { w: number; h: number };
  spriteSourceSize: SpriteSourceSize;
  fileWritten: boolean;
}

export function sanitizeAnimationName(name: string): string {
  return name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
}

function makeCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined" && typeof OffscreenCanvas.prototype.convertToBlob === "function") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2dContext(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  return canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Uint8Array> {
  let blob: Blob | null = null;
  if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
    try {
      blob = await canvas.convertToBlob({ type: "image/png" });
    } catch {
      blob = null;
    }
  }
  if (!blob && "toBlob" in canvas && typeof canvas.toBlob === "function") {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  if (!blob) {
    const fallback = document.createElement("canvas");
    fallback.width = canvas.width;
    fallback.height = canvas.height;
    const context = fallback.getContext("2d");
    if (!context) throw new Error("Could not create a PNG encoding context.");
    context.drawImage(canvas, 0, 0);
    blob = await new Promise<Blob | null>((resolve) => fallback.toBlob(resolve, "image/png"));
  }
  if (!blob) throw new Error("PNG encoding failed.");
  return new Uint8Array(await blob.arrayBuffer());
}

async function writeBinaryFile(path: string, bytes: Uint8Array) {
  // Tauri commands use JSON IPC; an integer array deserializes to Rust Vec<u8>.
  await invoke("write_binary_file", { path, data: Array.from(bytes) });
}

function isCanvasTransparent(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
  const context = get2dContext(canvas);
  if (!context || canvas.width === 0 || canvas.height === 0) return true;
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let alpha = 3; alpha < data.length; alpha += 4) {
    if (data[alpha] > 0) return false;
  }
  return true;
}

function checkAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Export canceled", "AbortError");
}

function makeSequenceFilename(animation: string, index: number) {
  return `${animation}_${String(index).padStart(2, "0")}.png`;
}

function frameKey(animation: string, index: number) {
  return makeSequenceFilename(animation, index).replace(/\.png$/i, "");
}

function makeSheetJsonFrames(placements: PackedSheet["frames"]) {
  return Object.fromEntries(Object.entries(placements).map(([key, rect]) => [key, {
    frame: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
  }]));
}

function buildMetadata(args: ExportFrameArgs, animation: string, frames: PreparedFrame[], sheet: PackedSheet | null, sheetName: string | null, sequenceIncluded: boolean) {
  const { normalizeEnabled, normalizeConfig, fps, loop, exportConfig } = args;
  const width = normalizeEnabled ? normalizeConfig.targetW : Math.max(0, ...frames.map((frame) => frame.canvas.width));
  const height = normalizeEnabled ? normalizeConfig.targetH : Math.max(0, ...frames.map((frame) => frame.canvas.height));
  const spriteSheet = sheet && sheetName ? {
    image: sheetName,
    size: { w: sheet.width, h: sheet.height },
    frames: makeSheetJsonFrames(sheet.frames),
  } : null;

  if (!exportConfig.exportMetadata) {
    return { version: 1, animation, spriteSheet };
  }

  return {
    version: 1,
    animation,
    fps,
    loop,
    frameCount: frames.length,
    frameWidth: width,
    frameHeight: height,
    anchor: normalizeEnabled ? normalizeConfig.anchor : "none",
    trimFirst: normalizeEnabled && normalizeConfig.trimFirst,
    frames: frames.map((frame) => ({
      index: frame.index,
      file: sequenceIncluded && frame.fileWritten ? frame.fileName : null,
      sourceSize: frame.sourceSize,
      spriteSourceSize: frame.spriteSourceSize,
    })),
    spriteSheet,
  };
}

function makeAbortResult(outputPath: string, filesWritten: string[], frames: PreparedFrame[], errors: ExportError[], warnings: string[], progressCurrent: number, progressTotal: number): ExportResult {
  return { outputPath, filesWritten, exportedFrames: frames.length, errors, warnings, cancelled: true, progressCurrent, progressTotal };
}

export async function exportFrames(args: ExportFramesArgs): Promise<ExportResult> {
  const { frames, sourceBitmap, normalizeEnabled, normalizeConfig, exportConfig, onProgress, signal } = args;
  if (!exportConfig.outputDir) throw new Error("Choose an output folder before exporting.");
  if (frames.length === 0) throw new Error("No frames to export.");
  const animation = sanitizeAnimationName(exportConfig.animName);
  if (!animation) throw new Error("Animation name must contain at least one letter or number.");

  const outputPath = exportConfig.perAnimFolder
    ? await join(exportConfig.outputDir, animation)
    : exportConfig.outputDir;
  const outputExists = await invoke<boolean>("path_exists", { path: outputPath });
  if (!outputExists) await invoke("create_dir_if_not_exists", { path: outputPath });

  const wantsSequence = exportConfig.format === "png-sequence" || exportConfig.format === "both";
  const wantsSheet = exportConfig.format === "sprite-sheet" || exportConfig.format === "both";
  const writesMetadata = exportConfig.exportMetadata || wantsSheet;
  let total = frames.length + (wantsSheet ? 1 : 0) + (writesMetadata ? 1 : 0);
  let sequenceFilesIncluded = wantsSequence;
  const filesWritten: string[] = [];
  const errors: ExportError[] = [];
  const warnings: string[] = [];
  const prepared: PreparedFrame[] = [];
  let progress = 0;

  try {
    for (let index = 0; index < frames.length; index++) {
      checkAborted(signal);
      const frame = frames[index];
      const fileName = makeSequenceFilename(animation, index);
      onProgress(progress, total, `Preparing frame ${index + 1}/${frames.length} (${fileName})`);

      if (frame.w <= 0 || frame.h <= 0) {
        errors.push({ frameId: frame.id, message: "Frame width and height must be greater than zero." });
        progress++;
        onProgress(progress, total, `Skipped invalid frame ${index + 1}/${frames.length}`);
        continue;
      }

      const frameW = Math.max(1, Math.round(frame.w));
      const frameH = Math.max(1, Math.round(frame.h));
      const rawCanvas = makeCanvas(frameW, frameH);
      const rawContext = get2dContext(rawCanvas);
      if (!rawContext) {
        errors.push({ frameId: frame.id, message: "Could not create a canvas for this frame." });
        progress++;
        continue;
      }
      rawContext.clearRect(0, 0, frameW, frameH);
      try {
        rawContext.drawImage(sourceBitmap, frame.x, frame.y, frame.w, frame.h, 0, 0, frameW, frameH);
      } catch (error) {
        errors.push({ frameId: frame.id, message: error instanceof Error ? error.message : String(error) });
        progress++;
        onProgress(progress, total, `Failed frame ${index + 1}/${frames.length}`);
        continue;
      }

      if (exportConfig.skipEmptyFrames && isCanvasTransparent(rawCanvas)) {
        progress++;
        onProgress(progress, total, `Skipped empty frame ${index + 1}/${frames.length}`);
        continue;
      }

      let canvas: HTMLCanvasElement | OffscreenCanvas = rawCanvas;
      let sourceSize = { w: frameW, h: frameH };
      let spriteSourceSize: SpriteSourceSize = { x: 0, y: 0, w: frameW, h: frameH };
      if (normalizeEnabled) {
        const result = normalizeFrame(frame, sourceBitmap as unknown as HTMLImageElement, normalizeConfig);
        if (result.error) {
          errors.push({ frameId: frame.id, message: result.error === "FRAME_TOO_LARGE" ? "Frame exceeds the normalize target size." : "Could not read image pixels for this frame." });
          progress++;
          onProgress(progress, total, `Failed frame ${index + 1}/${frames.length}`);
          continue;
        }
        canvas = result.normalizedCanvas;
        sourceSize = result.sourceSize;
        spriteSourceSize = result.spriteSourceSize;
      }

      const item: PreparedFrame = { frame, index, key: frameKey(animation, index), fileName, canvas, sourceSize, spriteSourceSize, fileWritten: false };
      prepared.push(item);
      if (wantsSequence) {
        try {
          const bytes = await canvasToPngBytes(canvas);
          const filePath = await join(outputPath, fileName);
          await writeBinaryFile(filePath, bytes);
          item.fileWritten = true;
          filesWritten.push(filePath);
        } catch (error) {
          errors.push({ frameId: frame.id, message: error instanceof Error ? error.message : String(error) });
        }
      }
      progress++;
      onProgress(progress, total, wantsSequence
        ? `Writing frame ${index + 1}/${frames.length} (${fileName})`
        : `Prepared frame ${index + 1}/${frames.length}`);
    }

    let packedSheet: PackedSheet | null = null;
    let sheetName: string | null = null;
    if (wantsSheet) {
      checkAborted(signal);
      progress++;
      onProgress(progress, total, "Packing sprite sheet");
      try {
        const sheetItems: SheetItem[] = prepared.map((frame) => ({
          key: frame.key,
          canvas: frame.canvas,
          width: frame.canvas.width,
          height: frame.canvas.height,
        }));
        packedSheet = packSpriteSheet(sheetItems, exportConfig.sheetPadding, exportConfig.sheetPowerOfTwo);
        sheetName = `${animation}_sheet.png`;
        const sheetPath = await join(outputPath, sheetName);
        await writeBinaryFile(sheetPath, await canvasToPngBytes(packedSheet.canvas));
        filesWritten.push(sheetPath);
      } catch (error) {
        packedSheet = null;
        sheetName = null;
        warnings.push(`Sprite-sheet packing failed; frame PNGs were kept. ${error instanceof Error ? error.message : String(error)}`);
        if (!wantsSequence) {
          sequenceFilesIncluded = true;
          total += prepared.length;
          for (const frame of prepared) {
            checkAborted(signal);
            try {
              const filePath = await join(outputPath, frame.fileName);
              await writeBinaryFile(filePath, await canvasToPngBytes(frame.canvas));
              frame.fileWritten = true;
              filesWritten.push(filePath);
            } catch (writeError) {
              errors.push({ frameId: frame.frame.id, message: writeError instanceof Error ? writeError.message : String(writeError) });
            }
            progress++;
            onProgress(progress, total, `Fallback: writing ${frame.fileName}`);
          }
        }
      }
    }

    if (writesMetadata) {
      checkAborted(signal);
      progress++;
      onProgress(progress, total, "Writing meta.json");
      const metadata = buildMetadata(args, animation, prepared, packedSheet, sheetName, sequenceFilesIncluded);
      const metadataPath = await join(outputPath, "meta.json");
      await writeBinaryFile(metadataPath, new TextEncoder().encode(JSON.stringify(metadata, null, 2)));
      filesWritten.push(metadataPath);
    }

    onProgress(total, total, "Export complete");
    return { outputPath, filesWritten, exportedFrames: prepared.length, errors, warnings, cancelled: false, progressCurrent: total, progressTotal: total };
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return makeAbortResult(outputPath, filesWritten, prepared, errors, warnings, progress, total);
    }
    throw error;
  }
}
