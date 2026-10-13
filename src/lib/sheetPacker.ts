import { MaxRectsPacker, type IRectangle } from "maxrects-packer";

export interface SheetItem {
  key: string;
  canvas: CanvasImageSource;
  width: number;
  height: number;
}

interface PackRect extends IRectangle {
  hash: string;
  item: SheetItem;
}

export interface SheetPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PackedSheet {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  frames: Record<string, SheetPlacement>;
}

export class SheetPackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetPackError";
  }
}

const MAX_SHEET_DIMENSION = 4096;

export function packSpriteSheet(items: SheetItem[], padding: number, powerOfTwo: boolean): PackedSheet {
  if (items.length === 0) throw new SheetPackError("There are no frames to pack.");
  if (items.some((item) => item.width <= 0 || item.height <= 0 || item.width > MAX_SHEET_DIMENSION || item.height > MAX_SHEET_DIMENSION)) {
    throw new SheetPackError(`A frame exceeds the ${MAX_SHEET_DIMENSION}px sheet packing limit.`);
  }

  const packer = new MaxRectsPacker<PackRect>(MAX_SHEET_DIMENSION, MAX_SHEET_DIMENSION, Math.max(0, Math.round(padding)), {
    smart: true,
    pot: powerOfTwo,
    square: false,
    allowRotation: false,
    border: 0,
  });
  packer.addArray(items.map((item) => ({
    width: item.width,
    height: item.height,
    x: 0,
    y: 0,
    hash: item.key,
    item,
  })));

  if (packer.bins.length !== 1) {
    throw new SheetPackError(`Frames require ${packer.bins.length} sheets; this exporter writes one sheet.`);
  }
  const bin = packer.bins[0];
  const packedRects = bin.rects;
  if (packedRects.length !== items.length || packedRects.some((rect) => rect.oversized)) {
    throw new SheetPackError("The sprite-sheet packer could not fit every frame.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = bin.width;
  canvas.height = bin.height;
  const context = canvas.getContext("2d");
  if (!context) throw new SheetPackError("Could not create a 2D context for the sprite sheet.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;

  const frames: Record<string, SheetPlacement> = {};
  for (const rect of packedRects) {
    context.drawImage(rect.item.canvas, rect.x, rect.y);
    frames[rect.item.key] = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  }

  return { canvas, width: bin.width, height: bin.height, frames };
}
