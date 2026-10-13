import { create } from "zustand";

export type NormalizeAnchor = "bottom-center" | "bottom-left" | "center" | "custom";
export type NormalizeBackground = "transparent" | { r: number; g: number; b: number; a: number };

export interface NormalizeConfig {
  targetW: number;
  targetH: number;
  anchor: NormalizeAnchor;
  customAnchorX: number;
  customAnchorY: number;
  trimFirst: boolean;
  keepAspect: boolean;
  background: NormalizeBackground;
}

interface NormalizeState {
  enabled: boolean;
  showBaselines: boolean;
  config: NormalizeConfig;
  setConfig: (patch: Partial<NormalizeConfig>) => void;
  reset: () => void;
  toggleEnabled: () => void;
  setShowBaselines: (show: boolean) => void;
}

const DEFAULT_CONFIG: NormalizeConfig = {
  targetW: 128,
  targetH: 128,
  anchor: "bottom-center",
  customAnchorX: 0.5,
  customAnchorY: 1,
  trimFirst: true,
  keepAspect: true,
  background: "transparent",
};

export const useNormalizeStore = create<NormalizeState>((set) => ({
  enabled: false,
  showBaselines: true,
  config: { ...DEFAULT_CONFIG },
  setConfig: (patch) => set((state) => {
    const next = { ...state.config, ...patch };
    if (patch.customAnchorX !== undefined) next.customAnchorX = Math.max(0, Math.min(1, patch.customAnchorX));
    if (patch.customAnchorY !== undefined) next.customAnchorY = Math.max(0, Math.min(1, patch.customAnchorY));
    return { config: next };
  }),
  reset: () => set({ enabled: false, showBaselines: true, config: { ...DEFAULT_CONFIG } }),
  toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
  setShowBaselines: (showBaselines) => set({ showBaselines }),
}));
