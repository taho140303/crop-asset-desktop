export interface GridConfig {
  rows: number;
  cols: number;
  fw: number;
  fh: number;
  gapX: number;
  gapY: number;
  offX: number;
  offY: number;
}

export interface GridFrame {
  id: string;
  index: number;
  row?: number;
  col?: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SlicingMode = "uniform" | "auto" | "manual";
