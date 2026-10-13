import { useCallback, useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";

export function useAnimationPlayer(frameIds: readonly string[], fps: number, loop: boolean, isPlaying: boolean) {
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playing = usePlayerStore((state) => state.isPlaying);
  const setCurrentIndex = usePlayerStore((state) => state.setCurrentIndex);
  const playStore = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);

  useEffect(() => {
    if (frameIds.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      if (playing) pause();
      return;
    }
    const clamped = Math.min(currentIndex, frameIds.length - 1);
    if (clamped !== currentIndex) setCurrentIndex(clamped);
    if (frameIds.length < 2 && playing) pause();
  }, [frameIds.length, currentIndex, playing, pause, setCurrentIndex]);

  useEffect(() => {
    if (!isPlaying || frameIds.length < 2) return;

    let rafId = 0;
    let previousTimestamp: number | null = null;
    let accumulatedMs = 0;
    const intervalMs = 1000 / Math.max(1, Math.min(60, fps));

    const tick = (timestamp: number) => {
      if (previousTimestamp !== null) accumulatedMs += timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      const advances = Math.floor(accumulatedMs / intervalMs);
      if (advances > 0) {
        accumulatedMs -= advances * intervalMs;
        const state = usePlayerStore.getState();
        const nextIndex = state.currentIndex + advances;
        if (loop) {
          setCurrentIndex(nextIndex % frameIds.length);
        } else if (nextIndex >= frameIds.length) {
          setCurrentIndex(frameIds.length - 1);
          pause();
          return;
        } else {
          setCurrentIndex(nextIndex);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [frameIds, fps, loop, isPlaying, pause, setCurrentIndex]);

  const play = useCallback(() => {
    if (frameIds.length === 0) return;
    const state = usePlayerStore.getState();
    if (!loop && state.currentIndex >= frameIds.length - 1) setCurrentIndex(0);
    playStore();
  }, [frameIds.length, loop, playStore, setCurrentIndex]);

  const toggle = useCallback(() => {
    if (usePlayerStore.getState().isPlaying) pause();
    else play();
  }, [pause, play]);

  const step = useCallback((delta: number) => {
    pause();
    if (frameIds.length === 0) return;
    const state = usePlayerStore.getState();
    const next = state.currentIndex + delta;
    const index = loop
      ? ((next % frameIds.length) + frameIds.length) % frameIds.length
      : Math.max(0, Math.min(frameIds.length - 1, next));
    setCurrentIndex(index);
  }, [frameIds.length, loop, pause, setCurrentIndex]);

  const seek = useCallback((index: number) => {
    pause();
    if (frameIds.length === 0) return;
    setCurrentIndex(Math.max(0, Math.min(frameIds.length - 1, Math.floor(index))));
  }, [frameIds.length, pause, setCurrentIndex]);

  return { currentIndex, playing, play, pause, toggle, step, seek };
}
