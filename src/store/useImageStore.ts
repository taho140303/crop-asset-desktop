import { create } from "zustand";
import type { LoadedImage, Viewport, RecentFile } from "@/types/image";
import { loadImageFromPath, loadImageFromFile } from "@/lib/imageLoader";
import { useGridStore } from "./useGridStore";

interface ImageState {
  currentImage: LoadedImage | null;
  viewport: Viewport;
  recentFiles: RecentFile[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadImage: (path: string) => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  setViewport: (
    viewport:
      | Partial<Viewport>
      | ((prev: Viewport) => Viewport)
      | number,
    offsetX?: number,
    offsetY?: number
  ) => void;
  resetViewport: () => void;
  fitToScreen: (containerWidth: number, containerHeight: number) => void;
  zoomToPoint: (
    newScale: number,
    clientX: number,
    clientY: number,
    containerRect: { left: number; top: number }
  ) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (deltaX: number, deltaY: number) => void;
  clearImage: () => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const SAMPLE_FILES: RecentFile[] = [
  {
    path: "/assets/sample-smoke-bomb.png",
    name: "sample-smoke-bomb.png",
    lastOpened: Date.now() - 1000 * 60 * 10,
  },
  {
    path: "/assets/sample-walk-cycle.png",
    name: "sample-walk-cycle.png",
    lastOpened: Date.now() - 1000 * 60 * 20,
  },
];

export const useImageStore = create<ImageState>((set, get) => ({
  currentImage: null,
  viewport: DEFAULT_VIEWPORT,
  recentFiles: SAMPLE_FILES,
  isLoading: false,
  error: null,

  loadImage: async (path: string) => {
    const prevImage = get().currentImage;
    set({ isLoading: true, error: null });

    try {
      const loaded = await loadImageFromPath(path);

      // Clean up previous object URL if any to prevent memory leaks
      if (prevImage?.objectUrl) {
        URL.revokeObjectURL(prevImage.objectUrl);
      }

      // Add to recent files
      const existing = get().recentFiles.filter((f) => f.path !== path);
      const updatedRecent: RecentFile[] = [
        {
          path,
          name: loaded.name,
          width: loaded.width,
          height: loaded.height,
          lastOpened: Date.now(),
        },
        ...existing,
      ].slice(0, 20);

      set({
        currentImage: loaded,
        recentFiles: updatedRecent,
        isLoading: false,
        error: null,
      });

      // Auto-update grid frame dimensions
      try {
        useGridStore.getState().autoFillFromImage(loaded.width, loaded.height);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  loadFile: async (file: File) => {
    const prevImage = get().currentImage;
    set({ isLoading: true, error: null });

    try {
      const loaded = await loadImageFromFile(file);

      // Clean up previous object URL if any to prevent memory leaks
      if (prevImage?.objectUrl) {
        URL.revokeObjectURL(prevImage.objectUrl);
      }

      // Add to recent files
      const existing = get().recentFiles.filter((f) => f.path !== loaded.path);
      const updatedRecent: RecentFile[] = [
        {
          path: loaded.path,
          name: loaded.name,
          width: loaded.width,
          height: loaded.height,
          lastOpened: Date.now(),
        },
        ...existing,
      ].slice(0, 20);

      set({
        currentImage: loaded,
        recentFiles: updatedRecent,
        isLoading: false,
        error: null,
      });

      // Auto-update grid frame dimensions
      try {
        useGridStore.getState().autoFillFromImage(loaded.width, loaded.height);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  setViewport: (updater, offX, offY) => {
    set((state) => {
      if (typeof updater === "number") {
        return {
          viewport: {
            scale: updater,
            offsetX: offX !== undefined ? offX : state.viewport.offsetX,
            offsetY: offY !== undefined ? offY : state.viewport.offsetY,
          },
        };
      }
      return {
        viewport:
          typeof updater === "function"
            ? updater(state.viewport)
            : { ...state.viewport, ...updater },
      };
    });
  },

  resetViewport: () => {
    set({ viewport: DEFAULT_VIEWPORT });
  },

  fitToScreen: (containerWidth: number, containerHeight: number) => {
    const { currentImage } = get();
    if (!currentImage || containerWidth <= 0 || containerHeight <= 0) return;

    const padding = 40;
    const availW = Math.max(10, containerWidth - padding * 2);
    const availH = Math.max(10, containerHeight - padding * 2);

    const scaleX = availW / currentImage.width;
    const scaleY = availH / currentImage.height;
    // Clamp fit scale between 0.25 and 16
    let scale = Math.min(scaleX, scaleY);
    // If image fits easily, cap at 1.0 or clamp to [0.25, 16]
    scale = Math.min(Math.max(scale, 0.25), 16);

    const displayW = currentImage.width * scale;
    const displayH = currentImage.height * scale;

    const offsetX = (containerWidth - displayW) / 2;
    const offsetY = (containerHeight - displayH) / 2;

    set({
      viewport: {
        scale,
        offsetX,
        offsetY,
      },
    });
  },

  zoomToPoint: (
    newScale: number,
    clientX: number,
    clientY: number,
    containerRect: { left: number; top: number }
  ) => {
    const { viewport } = get();
    const clampedScale = Math.min(Math.max(newScale, 0.25), 16);

    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;

    // Image coordinate before zoom:
    const imgX = (mouseX - viewport.offsetX) / viewport.scale;
    const imgY = (mouseY - viewport.offsetY) / viewport.scale;

    // New offset so (imgX, imgY) remains at (mouseX, mouseY):
    const newOffsetX = mouseX - imgX * clampedScale;
    const newOffsetY = mouseY - imgY * clampedScale;

    set({
      viewport: {
        scale: clampedScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      },
    });
  },

  zoomIn: () => {
    const { viewport } = get();
    const nextScale = Math.min(16, viewport.scale * 1.25);
    set({ viewport: { ...viewport, scale: nextScale } });
  },
  zoomOut: () => {
    const { viewport } = get();
    const nextScale = Math.max(0.25, viewport.scale / 1.25);
    set({ viewport: { ...viewport, scale: nextScale } });
  },
  resetZoom: () => {
    const { viewport } = get();
    set({ viewport: { ...viewport, scale: 1 } });
  },
  setPan: (deltaX: number, deltaY: number) => {
    const { viewport } = get();
    set({
      viewport: {
        ...viewport,
        offsetX: viewport.offsetX + deltaX,
        offsetY: viewport.offsetY + deltaY,
      },
    });
  },
  clearImage: () => {
    const prevImage = get().currentImage;
    if (prevImage?.objectUrl) {
      URL.revokeObjectURL(prevImage.objectUrl);
    }
    set({ currentImage: null, viewport: DEFAULT_VIEWPORT, error: null });
  },
}));
