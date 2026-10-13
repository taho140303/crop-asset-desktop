import { create } from "zustand";
import { exportFrames, type ExportFramesArgs, type ExportResult } from "@/lib/exporter";
import type { ExportConfig } from "@/lib/exporter";

export type ExportFormat = "png-sequence" | "sprite-sheet" | "both";
export interface ExportSettings extends ExportConfig {}
export interface ExportProgress {
  current: number;
  total: number;
  phase: string;
}
export interface ExportIssue {
  frameId: string;
  message: string;
}

interface ExportStoreState {
  config: ExportSettings;
  isExporting: boolean;
  progress: ExportProgress;
  lastExportPath: string | null;
  lastResult: ExportResult | null;
  errors: ExportIssue[];
  setConfig: (patch: Partial<Omit<ExportSettings, "namingPattern">>) => void;
  startExport: (args: Omit<ExportFramesArgs, "signal" | "onProgress">) => Promise<ExportResult>;
  cancelExport: () => void;
  reset: () => void;
}

const DEFAULT_CONFIG: ExportSettings = {
  outputDir: null,
  animName: "idle",
  format: "both",
  namingPattern: "{anim}_{index:02d}",
  perAnimFolder: true,
  exportMetadata: true,
  skipEmptyFrames: true,
  sheetPadding: 2,
  sheetPowerOfTwo: false,
};

let activeAbortController: AbortController | null = null;

export const useExportStore = create<ExportStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  isExporting: false,
  progress: { current: 0, total: 0, phase: "Idle" },
  lastExportPath: null,
  lastResult: null,
  errors: [],
  setConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch, namingPattern: DEFAULT_CONFIG.namingPattern } })),
  startExport: async (args) => {
    if (get().isExporting) throw new Error("An export is already running.");
    const controller = new AbortController();
    activeAbortController = controller;
    set({ isExporting: true, errors: [], lastResult: null, progress: { current: 0, total: args.frames.length, phase: "Preparing export" } });
    try {
      const result = await exportFrames({
        ...args,
        signal: controller.signal,
        onProgress: (current, total, phase) => set({ progress: { current, total, phase } }),
      });
      set({
        isExporting: false,
        progress: { current: result.progressCurrent, total: result.progressTotal, phase: result.cancelled ? "Canceled" : "Complete" },
        lastExportPath: result.outputPath,
        lastResult: result,
        errors: result.errors,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set((state) => ({
        isExporting: false,
        progress: { ...state.progress, phase: "Failed" },
        errors: [...state.errors, { frameId: "", message }],
      }));
      throw error;
    } finally {
      if (activeAbortController === controller) activeAbortController = null;
    }
  },
  cancelExport: () => {
    activeAbortController?.abort();
    set((state) => ({ progress: { ...state.progress, phase: "Canceling after current file…" } }));
  },
  reset: () => {
    activeAbortController?.abort();
    activeAbortController = null;
    set({ config: { ...DEFAULT_CONFIG }, isExporting: false, progress: { current: 0, total: 0, phase: "Idle" }, lastExportPath: null, lastResult: null, errors: [] });
  },
}));
