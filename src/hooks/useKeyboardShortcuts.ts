import { useEffect, type RefObject } from "react";
import { computeFrames, useFrameStore, useFrameHistory } from "@/store/useFrameStore";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";

export function useKeyboardShortcuts(canvasRef: RefObject<HTMLElement | null>, enabled = true) {
  const { undo, redo } = useFrameHistory();

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, button"))
      ) return;
      if (!canvasRef.current?.contains(document.activeElement)) return;

      const frameStore = useFrameStore.getState();
      const { mode, config } = useGridStore.getState();
      const selected = frameStore.selectedIds;
      const control = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (control && key === "a") {
        event.preventDefault();
        const visible = mode === "manual" ? frameStore.frames : mode === "auto"
          ? useAutoDetectStore.getState().detectedFrames.map((frame, index) => ({ id: `auto-${index}`, ...frame }))
          : computeFrames(config);
        frameStore.selectFrames(visible.map((frame) => frame.id));
        return;
      }

      if (control && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (control && (key === "y" || key === "d")) {
        event.preventDefault();
        if (key === "y") redo();
        else if (mode === "manual") frameStore.duplicateFrames(selected, 10, 10);
        return;
      }

      if (mode !== "manual" || selected.length === 0) return;
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        frameStore.removeFrames(selected);
        return;
      }

      if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dir = key === "arrowleft" || key === "arrowup" ? -1 : 1;
        const horizontal = key === "arrowleft" || key === "arrowright";
        const patches = frameStore.frames
          .filter((frame) => selected.includes(frame.id))
          .map((frame) => ({
            id: frame.id,
            patch: event.altKey
              ? horizontal
                ? { w: Math.max(4, frame.w + dir * step) }
                : { h: Math.max(4, frame.h + dir * step) }
              : horizontal
                ? { x: frame.x + dir * step }
                : { y: frame.y + dir * step },
          }));
        frameStore.updateFrames(patches);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvasRef, enabled, redo, undo]);
}
