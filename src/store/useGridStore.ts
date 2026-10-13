import { create } from "zustand";
import type { GridConfig, GridFrame, SlicingMode } from "@/types/grid";

interface GridStoreState {
  mode: SlicingMode;
  config: GridConfig;
  manualFrames: GridFrame[];
  selectedFrameIds: string[];
  hoveredFrameId: string | null;

  // Actions
  setMode: (mode: SlicingMode) => void;
  updateConfig: (patch: Partial<GridConfig>) => void;
  setManualFrames: (frames: GridFrame[]) => void;
  convertAutoToManual: (bboxes: { x: number; y: number; w: number; h: number }[]) => void;
  applyPreset: (rows: number, cols: number, imgWidth?: number, imgHeight?: number) => void;
  autoFillFromImage: (imgWidth: number, imgHeight: number) => void;
  selectFrame: (id: string, multiSelect?: boolean) => void;
  selectAllFrames: () => void;
  clearSelection: () => void;
  setHoveredFrame: (id: string | null) => void;
  getFrames: () => GridFrame[];
}

export function computeFrames(config: GridConfig): GridFrame[] {
  const { rows, cols, fw, fh, gapX, gapY, offX, offY } = config;
  const frames: GridFrame[] = [];
  let index = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offX + c * (fw + gapX);
      const y = offY + r * (fh + gapY);
      frames.push({
        id: `frame-${r}-${c}`,
        index,
        row: r,
        col: c,
        x,
        y,
        w: fw,
        h: fh,
      });
      index++;
    }
  }

  return frames;
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
  manualFrames: [],
  selectedFrameIds: [],
  hoveredFrameId: null,

  setMode: (mode) => set({ mode }),

  updateConfig: (patch) => {
    set((state) => {
      const newConfig = { ...state.config, ...patch };
      return { config: newConfig };
    });
  },

  setManualFrames: (frames) => {
    set({ manualFrames: frames, selectedFrameIds: [] });
  },

  convertAutoToManual: (bboxes) => {
    const frames: GridFrame[] = bboxes.map((b, idx) => ({
      id: `manual-frame-${idx}`,
      index: idx,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
    }));
    set({
      manualFrames: frames,
      mode: "manual",
      selectedFrameIds: [],
    });
  },

  applyPreset: (rows, cols, imgWidth, imgHeight) => {
    set((state) => {
      let fw = state.config.fw;
      let fh = state.config.fh;

      if (imgWidth && imgHeight) {
        fw = Math.max(1, Math.floor(imgWidth / cols));
        fh = Math.max(1, Math.floor(imgHeight / rows));
      }

      return {
        config: {
          ...state.config,
          rows,
          cols,
          fw,
          fh,
          gapX: 0,
          gapY: 0,
          offX: 0,
          offY: 0,
        },
        selectedFrameIds: [],
      };
    });
  },

  autoFillFromImage: (imgWidth, imgHeight) => {
    set((state) => {
      const cols = Math.max(1, state.config.cols);
      const rows = Math.max(1, state.config.rows);
      const fw = Math.max(1, Math.floor(imgWidth / cols));
      const fh = Math.max(1, Math.floor(imgHeight / rows));

      return {
        config: {
          ...state.config,
          fw,
          fh,
          gapX: 0,
          gapY: 0,
          offX: 0,
          offY: 0,
        },
      };
    });
  },

  selectFrame: (id, multiSelect = false) => {
    set((state) => {
      if (multiSelect) {
        const exists = state.selectedFrameIds.includes(id);
        const newIds = exists
          ? state.selectedFrameIds.filter((item) => item !== id)
          : [...state.selectedFrameIds, id];
        return { selectedFrameIds: newIds };
      }
      return { selectedFrameIds: [id] };
    });
  },

  selectAllFrames: () => {
    const frames = get().getFrames();
    set({ selectedFrameIds: frames.map((f) => f.id) });
  },

  clearSelection: () => {
    set({ selectedFrameIds: [] });
  },

  setHoveredFrame: (id) => {
    set({ hoveredFrameId: id });
  },

  getFrames: () => {
    const state = get();
    if (state.mode === "manual") {
      return state.manualFrames;
    }
    return computeFrames(state.config);
  },
}));
