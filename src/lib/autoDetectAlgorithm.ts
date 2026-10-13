import { DetectedBBox, AutoDetectConfig } from "../types/autoDetect";

export interface DetectResult {
  bboxes: DetectedBBox[];
  hasNoAlpha: boolean;
  totalPixelsWithAlpha: number;
  durationMs: number;
}

export function detectFramesFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  config: AutoDetectConfig
): DetectResult {
  const startTime = performance.now();
  const { alphaThreshold, minGap, minFrameSize, mergeTouching } = config;

  const totalPixels = width * height;
  let nonZeroAlphaCount = 0;
  let fullyOpaqueCount = 0;

  // We need column projections
  // hasPixelInCol[x] = true if any y has alpha > alphaThreshold
  const hasPixelInCol = new Uint8Array(width);

  // We can scan image line by line
  // Alpha is at index (y * width + x) * 4 + 3
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const a = data[rowOffset + x * 4 + 3];
      if (a > alphaThreshold) {
        hasPixelInCol[x] = 1;
        nonZeroAlphaCount++;
      }
      if (a === 255) {
        fullyOpaqueCount++;
      }
    }
  }

  // Check if image has virtually no transparency (e.g. fully opaque background)
  // If nonZeroAlphaCount is virtually 100% and fullyOpaqueCount > 98%, user likely loaded a solid background image
  const hasNoAlpha = nonZeroAlphaCount === totalPixels && fullyOpaqueCount > totalPixels * 0.99;

  if (hasNoAlpha) {
    return {
      bboxes: [],
      hasNoAlpha: true,
      totalPixelsWithAlpha: nonZeroAlphaCount,
      durationMs: performance.now() - startTime,
    };
  }

  // 1. Find continuous X segments where hasPixelInCol is 1
  interface Segment {
    start: number;
    end: number; // exclusive
  }

  const rawXSegments: Segment[] = [];
  let inSeg = false;
  let segStart = 0;

  for (let x = 0; x < width; x++) {
    if (hasPixelInCol[x]) {
      if (!inSeg) {
        inSeg = true;
        segStart = x;
      }
    } else {
      if (inSeg) {
        inSeg = false;
        rawXSegments.push({ start: segStart, end: x });
      }
    }
  }
  if (inSeg) {
    rawXSegments.push({ start: segStart, end: width });
  }

  // 2. Merge X segments with gap < minGap (if mergeTouching is true or minGap > 0)
  const mergedXSegments: Segment[] = [];
  for (const seg of rawXSegments) {
    if (mergedXSegments.length === 0) {
      mergedXSegments.push({ ...seg });
    } else {
      const last = mergedXSegments[mergedXSegments.length - 1];
      const gap = seg.start - last.end;
      // If gap < minGap, merge them
      if (gap < minGap || (mergeTouching && gap <= 1)) {
        last.end = seg.end;
      } else {
        mergedXSegments.push({ ...seg });
      }
    }
  }

  // 3. For each X segment: scan Y axis to find bboxes
  // Depending on whether it's a strip or grid of characters, inside an X segment there could be multiple rows!
  const bboxes: DetectedBBox[] = [];

  for (const xSeg of mergedXSegments) {
    const sx0 = xSeg.start;
    const sx1 = xSeg.end;

    // Projection on Y within this X segment
    const hasPixelInRow = new Uint8Array(height);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = sx0; x < sx1; x++) {
        if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
          hasPixelInRow[y] = 1;
        }
      }
    }

    // Find continuous Y segments
    const rawYSegments: Segment[] = [];
    let inY = false;
    let yStart = 0;
    for (let y = 0; y < height; y++) {
      if (hasPixelInRow[y]) {
        if (!inY) {
          inY = true;
          yStart = y;
        }
      } else {
        if (inY) {
          inY = false;
          rawYSegments.push({ start: yStart, end: y });
        }
      }
    }
    if (inY) {
      rawYSegments.push({ start: yStart, end: height });
    }

    // Merge Y segments with gap < minGap
    const mergedYSegments: Segment[] = [];
    for (const ySeg of rawYSegments) {
      if (mergedYSegments.length === 0) {
        mergedYSegments.push({ ...ySeg });
      } else {
        const last = mergedYSegments[mergedYSegments.length - 1];
        const gap = ySeg.start - last.end;
        if (gap < minGap || (mergeTouching && gap <= 1)) {
          last.end = ySeg.end;
        } else {
          mergedYSegments.push({ ...ySeg });
        }
      }
    }

    // For each Y segment, compute the exact tight X and Y bounds
    for (const ySeg of mergedYSegments) {
      const sy0 = ySeg.start;
      const sy1 = ySeg.end;

      let minX = sx1;
      let maxX = sx0;
      let minY = sy1;
      let maxY = sy0;

      for (let y = sy0; y < sy1; y++) {
        const rowOffset = y * width * 4;
        for (let x = sx0; x < sx1; x++) {
          if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (minX <= maxX && minY <= maxY) {
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;

        // Filter: min frame size (px, default 20) — bỏ qua vùng quá nhỏ
        // Either w < minFrameSize || h < minFrameSize or w * h < minFrameSize
        if (bw >= minFrameSize && bh >= minFrameSize && bw * bh >= minFrameSize) {
          bboxes.push({
            x: minX,
            y: minY,
            w: bw,
            h: bh,
          });
        }
      }
    }
  }

  // 4. Sort: top-to-bottom, left-to-right (or left-to-right for strips)
  // For grid layouts, group by approximate row or sort by (y, x)
  bboxes.sort((a, b) => {
    // If they are on significantly different vertical lines (e.g. > half height difference)
    const yDiff = Math.abs(a.y - b.y);
    const avgH = (a.h + b.h) / 2;
    if (yDiff > avgH * 0.5) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return {
    bboxes,
    hasNoAlpha,
    totalPixelsWithAlpha: nonZeroAlphaCount,
    durationMs: performance.now() - startTime,
  };
}
