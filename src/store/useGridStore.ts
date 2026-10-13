import { create } from "zustand";
import type { GridConfig, SlicingMode } from "@/types/grid";
import { computeFrames, type Frame } from "@/store/useFrameStore";

interface GridStoreState {
  mode: SlicingMode;
  config: GridConfig;
  setMode: (mode: SlicingMode) => void;
  updateConfig: (patch: Partial<GridConfig>) => void;
  applyPreset: (rows: number, cols: number, imgWidth?: number, imgHeight?: number) => void;
  autoFillFromImage: (imgWidth: number, imgHeight: number) => void;
  getFrames: () => Frame[];
}

export const useGridStore = create<GridStoreState>((set, get) => ({
  mode: "uniform",
  config: {
    rows: 1,
    cols: 6,
    fw: 64,
    fh: 64,
    gapX: 0,
    gapY: 0,
    offX: 0,
    offY: 0,
  },
  setMode: (mode) => set({ mode }),
  updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
  applyPreset: (rows, cols, imgWidth, imgHeight) => set((state) => ({
    config: {
      ...state.config,
      rows,
      cols,
      fw: imgWidth ? Math.max(1, Math.floor(imgWidth / cols)) : state.config.fw,
      fh: imgHeight ? Math.max(1, Math.floor(imgHeight / rows)) : state.config.fh,
      gapX: 0,
      gapY: 0,
      offX: 0,
      offY: 0,
    },
  })),
  autoFillFromImage: (imgWidth, imgHeight) => set((state) => ({
    config: {
      ...state.config,
      fw: Math.max(1, Math.floor(imgWidth / Math.max(1, state.config.cols))),
      fh: Math.max(1, Math.floor(imgHeight / Math.max(1, state.config.rows))),
      gapX: 0,
      gapY: 0,
      offX: 0,
      offY: 0,
    },
  })),
  // Compatibility accessor only; generated frames are owned by useFrameStore.
  getFrames: () => computeFrames(get().config),
}));
