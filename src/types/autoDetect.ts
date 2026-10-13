export interface AutoDetectConfig {
  alphaThreshold: number; // 0 - 255, default 10
  minGap: number; // px, default 10
  minFrameSize: number; // px, default 20 (or min dimension / area)
  mergeTouching: boolean; // default true
}

export interface DetectedBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
