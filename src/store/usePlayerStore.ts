import { create } from "zustand";

export type PlaybackOrder = "sequence" | "reverse" | "pingpong";

export interface PlayerState {
  isPlaying: boolean;
  currentIndex: number;
  fps: number;
  loop: boolean;
  onionSkin: boolean;
  playbackOrder: PlaybackOrder;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setFps: (fps: number) => void;
  setLoop: (loop: boolean) => void;
  setOnionSkin: (enabled: boolean) => void;
  setPlaybackOrder: (order: PlaybackOrder) => void;
  setCurrentIndex: (index: number) => void;
  reset: () => void;
}

export function selectOrderedFrameIds(frameIds: readonly string[], order: PlaybackOrder): string[] {
  if (order === "reverse") return [...frameIds].reverse();
  if (order === "pingpong" && frameIds.length > 2) {
    return [...frameIds, ...frameIds.slice(1, -1).reverse()];
  }
  return [...frameIds];
}

const initial = {
  isPlaying: false,
  currentIndex: 0,
  fps: 8,
  loop: true,
  onionSkin: false,
  playbackOrder: "sequence" as PlaybackOrder,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initial,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  stepForward: () => set((state) => ({ isPlaying: false, currentIndex: state.currentIndex + 1 })),
  stepBackward: () => set((state) => ({ isPlaying: false, currentIndex: Math.max(0, state.currentIndex - 1) })),
  setFps: (fps) => set({ fps: Math.max(1, Math.min(60, Math.round(fps))) }),
  setLoop: (loop) => set({ loop }),
  setOnionSkin: (onionSkin) => set({ onionSkin }),
  setPlaybackOrder: (playbackOrder) => set({ playbackOrder }),
  setCurrentIndex: (index) => set({ currentIndex: Math.max(0, Math.floor(index)) }),
  reset: () => set({ ...initial }),
}));
