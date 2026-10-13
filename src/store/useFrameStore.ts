import { create } from "zustand";
import { useStore } from "zustand";
import { temporal } from "zundo";
import type { GridConfig } from "@/types/grid";

export interface Frame {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface FrameStoreState {
  frames: Frame[];
  selectedIds: string[];
  hoveredId: string | null;
  addFrame: (frame?: Partial<Frame>) => string;
  removeFrames: (ids: string[]) => void;
  updateFrame: (id: string, patch: Partial<Omit<Frame, "id">>) => void;
  updateFrames: (patches: Array<{ id: string; patch: Partial<Omit<Frame, "id">> }>) => void;
  duplicateFrames: (ids: string[], dx?: number, dy?: number) => string[];
  splitFrame: (id: string, axis: "h" | "v") => void;
  mergeFrames: (ids: string[]) => void;
  setFrames: (frames: Frame[]) => void;
  selectFrame: (id: string, multiSelect?: boolean) => void;
  selectFrames: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  alignFrames: (alignment: "left" | "right" | "top" | "bottom" | "h-center" | "v-center") => void;
}

const newFrameId = () => `frame-${crypto.randomUUID()}`;

export function computeFrames(config: GridConfig): Frame[] {
  const { rows, cols, fw, fh, gapX, gapY, offX, offY } = config;
  const frames: Frame[] = [];
  for (let r = 0; r < Math.max(0, rows); r++) {
    for (let c = 0; c < Math.max(0, cols); c++) {
      frames.push({
        id: `grid-${r}-${c}`,
        x: offX + c * (fw + gapX),
        y: offY + r * (fh + gapY),
        w: fw,
        h: fh,
      });
    }
  }
  return frames;
}

export const useFrameStore = Object.assign(
  create<FrameStoreState>()(
    temporal(
      (set, get) => ({
        frames: [],
        selectedIds: [],
        hoveredId: null,
        addFrame: (frame = {}) => {
          const newFrame: Frame = {
            id: frame.id ?? newFrameId(),
            x: Math.round(frame.x ?? 0),
            y: Math.round(frame.y ?? 0),
            w: Math.max(4, Math.round(frame.w ?? 64)),
            h: Math.max(4, Math.round(frame.h ?? 64)),
            ...(frame.label !== undefined ? { label: frame.label } : {}),
          };
          set((state) => ({ frames: [...state.frames, newFrame], selectedIds: [newFrame.id] }));
          return newFrame.id;
        },
        removeFrames: (ids) => {
          const removed = new Set(ids);
          if (!removed.size) return;
          set((state) => ({
            frames: state.frames.filter((frame) => !removed.has(frame.id)),
            selectedIds: state.selectedIds.filter((id) => !removed.has(id)),
          }));
        },
        updateFrame: (id, patch) => {
          set((state) => ({
            frames: state.frames.map((frame) =>
              frame.id === id
                ? {
                    ...frame,
                    ...patch,
                    x: patch.x === undefined ? frame.x : Math.round(patch.x),
                    y: patch.y === undefined ? frame.y : Math.round(patch.y),
                    w: patch.w === undefined ? frame.w : Math.max(4, Math.round(patch.w)),
                    h: patch.h === undefined ? frame.h : Math.max(4, Math.round(patch.h)),
                  }
                : frame
            ),
          }));
        },
        updateFrames: (patches) => {
          const patchesById = new Map(patches.map(({ id, patch }) => [id, patch]));
          if (!patchesById.size) return;
          set((state) => ({
            frames: state.frames.map((frame) => {
              const patch = patchesById.get(frame.id);
              return patch
                ? {
                    ...frame,
                    ...patch,
                    x: patch.x === undefined ? frame.x : Math.round(patch.x),
                    y: patch.y === undefined ? frame.y : Math.round(patch.y),
                    w: patch.w === undefined ? frame.w : Math.max(4, Math.round(patch.w)),
                    h: patch.h === undefined ? frame.h : Math.max(4, Math.round(patch.h)),
                  }
                : frame;
            }),
          }));
        },
        duplicateFrames: (ids, dx = 10, dy = 10) => {
          const idSet = new Set(ids);
          const copies = get().frames
            .filter((frame) => idSet.has(frame.id))
            .map((frame) => ({ ...frame, id: newFrameId(), x: frame.x + dx, y: frame.y + dy }));
          if (copies.length) {
            set((state) => ({ frames: [...state.frames, ...copies], selectedIds: copies.map((f) => f.id) }));
          }
          return copies.map((frame) => frame.id);
        },
        splitFrame: (id, axis) => {
          const original = get().frames.find((frame) => frame.id === id);
          if (!original) return;
          if (axis === "h") {
            const firstW = Math.floor(original.w / 2);
            const secondW = original.w - firstW;
            if (firstW < 4 || secondW < 4) return;
            const left = { ...original, id: newFrameId(), w: firstW };
            const right = { ...original, id: newFrameId(), x: original.x + firstW, w: secondW };
            set((state) => ({
              frames: state.frames.flatMap((frame) => frame.id === id ? [left, right] : [frame]),
              selectedIds: [left.id, right.id],
            }));
          } else {
            const firstH = Math.floor(original.h / 2);
            const secondH = original.h - firstH;
            if (firstH < 4 || secondH < 4) return;
            const top = { ...original, id: newFrameId(), h: firstH };
            const bottom = { ...original, id: newFrameId(), y: original.y + firstH, h: secondH };
            set((state) => ({
              frames: state.frames.flatMap((frame) => frame.id === id ? [top, bottom] : [frame]),
              selectedIds: [top.id, bottom.id],
            }));
          }
        },
        mergeFrames: (ids) => {
          const idSet = new Set(ids);
          const chosen = get().frames.filter((frame) => idSet.has(frame.id));
          if (chosen.length < 2) return;
          const x = Math.min(...chosen.map((frame) => frame.x));
          const y = Math.min(...chosen.map((frame) => frame.y));
          const right = Math.max(...chosen.map((frame) => frame.x + frame.w));
          const bottom = Math.max(...chosen.map((frame) => frame.y + frame.h));
          const merged: Frame = { id: newFrameId(), x, y, w: right - x, h: bottom - y };
          set((state) => ({
            frames: [...state.frames.filter((frame) => !idSet.has(frame.id)), merged],
            selectedIds: [merged.id],
          }));
        },
        setFrames: (frames) => set({ frames: frames.map((frame) => ({ ...frame })) }),
        selectFrame: (id, multiSelect = false) => set((state) => {
          if (!multiSelect) return { selectedIds: [id] };
          return { selectedIds: state.selectedIds.includes(id) ? state.selectedIds.filter((item) => item !== id) : [...state.selectedIds, id] };
        }),
        selectFrames: (ids) => set({ selectedIds: [...new Set(ids)] }),
        selectAll: () => set({ selectedIds: get().frames.map((frame) => frame.id) }),
        clearSelection: () => set({ selectedIds: [] }),
        setHovered: (id) => set({ hoveredId: id }),
        alignFrames: (alignment) => {
          const ids = new Set(get().selectedIds);
          const selected = get().frames.filter((frame) => ids.has(frame.id));
          if (selected.length < 2) return;
          const minX = Math.min(...selected.map((frame) => frame.x));
          const maxX = Math.max(...selected.map((frame) => frame.x + frame.w));
          const minY = Math.min(...selected.map((frame) => frame.y));
          const maxY = Math.max(...selected.map((frame) => frame.y + frame.h));
          const centerX = (Math.min(...selected.map((f) => f.x)) + Math.max(...selected.map((f) => f.x + f.w))) / 2;
          const centerY = (Math.min(...selected.map((f) => f.y)) + Math.max(...selected.map((f) => f.y + f.h))) / 2;
          set((state) => ({ frames: state.frames.map((frame) => {
            if (!ids.has(frame.id)) return frame;
            switch (alignment) {
              case "left": return { ...frame, x: minX };
              case "right": return { ...frame, x: maxX - frame.w };
              case "top": return { ...frame, y: minY };
              case "bottom": return { ...frame, y: maxY - frame.h };
              case "h-center": return { ...frame, x: Math.round(centerX - frame.w / 2) };
              case "v-center": return { ...frame, y: Math.round(centerY - frame.h / 2) };
            }
          }) }));
        },
      }),
      {
        limit: 100,
        partialize: (state) => ({ frames: state.frames }),
        equality: (past, current) => JSON.stringify(past.frames) === JSON.stringify(current.frames),
      }
    )
  ),
  {}
);

export function useFrameHistory() {
  const temporalStore = useFrameStore.temporal;
  const undo = useStore(temporalStore, (state) => state.undo);
  const redo = useStore(temporalStore, (state) => state.redo);
  const pastStates = useStore(temporalStore, (state) => state.pastStates);
  const futureStates = useStore(temporalStore, (state) => state.futureStates);
  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    historyLength: pastStates.length,
  };
}
