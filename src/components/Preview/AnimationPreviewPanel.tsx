import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, Play, Pause, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGridStore } from "@/store/useGridStore";
import { computeFrames, useFrameStore, type Frame } from "@/store/useFrameStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { useImageStore } from "@/store/useImageStore";
import { useNormalizeStore } from "@/store/useNormalizeStore";
import { selectOrderedFrameIds, usePlayerStore } from "@/store/usePlayerStore";
import { useAnimationPlayer } from "@/hooks/useAnimationPlayer";
import { PreviewCanvas } from "@/components/Preview/PreviewCanvas";

export function AnimationPreviewPanel() {
  const [expanded, setExpanded] = useState(false);
  const [fpsDraft, setFpsDraft] = useState("8");
  const { mode, config: gridConfig } = useGridStore();
  const manualFrames = useFrameStore((state) => state.frames);
  const detectedFrames = useAutoDetectStore((state) => state.detectedFrames);
  const currentImage = useImageStore((state) => state.currentImage);
  const normalizeEnabled = useNormalizeStore((state) => state.enabled);
  const normalizeConfig = useNormalizeStore((state) => state.config);
  const fps = usePlayerStore((state) => state.fps);
  const loop = usePlayerStore((state) => state.loop);
  const onionSkin = usePlayerStore((state) => state.onionSkin);
  const playbackOrder = usePlayerStore((state) => state.playbackOrder);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setFps = usePlayerStore((state) => state.setFps);
  const setLoop = usePlayerStore((state) => state.setLoop);
  const setOnionSkin = usePlayerStore((state) => state.setOnionSkin);
  const setPlaybackOrder = usePlayerStore((state) => state.setPlaybackOrder);

  const frames = useMemo<Frame[]>(() => mode === "manual" ? manualFrames
    : mode === "auto" ? detectedFrames.map((frame, index) => ({ id: `auto-${index}`, ...frame }))
      : computeFrames(gridConfig), [mode, manualFrames, detectedFrames, gridConfig]);
  const orderedIds = useMemo(() => selectOrderedFrameIds(frames.map((frame) => frame.id), playbackOrder), [frames, playbackOrder]);
  const playbackFps = onionSkin ? Math.min(fps, 30) : fps;
  const { currentIndex, playing, toggle, step, seek } = useAnimationPlayer(orderedIds, playbackFps, loop, isPlaying);
  const safeIndex = orderedIds.length ? Math.min(currentIndex, orderedIds.length - 1) : 0;
  const frameMap = useMemo(() => new Map(frames.map((frame) => [frame.id, frame])), [frames]);
  const current = frameMap.get(orderedIds[safeIndex]) ?? null;
  const previous = safeIndex > 0 ? frameMap.get(orderedIds[safeIndex - 1]) ?? null
    : loop && orderedIds.length > 1 ? frameMap.get(orderedIds[orderedIds.length - 1]) ?? null : null;
  const next = safeIndex < orderedIds.length - 1 ? frameMap.get(orderedIds[safeIndex + 1]) ?? null
    : loop && orderedIds.length > 1 ? frameMap.get(orderedIds[0]) ?? null : null;

  useEffect(() => setFpsDraft(String(fps)), [fps]);

  const commitFps = () => {
    const parsed = Number(fpsDraft);
    if (!Number.isFinite(parsed)) {
      setFpsDraft(String(fps));
      return;
    }
    const value = Math.max(1, Math.min(60, Math.round(parsed)));
    setFps(value);
    setFpsDraft(String(value));
  };

  return (
    <section className="space-y-2 border-t border-border pt-4" aria-label="Animation preview">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left text-xs font-semibold">
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Animation Preview
        {frames.length > 0 && <span className="ml-auto font-mono text-muted-foreground">{frames.length} frames</span>}
      </button>

      {expanded && (frames.length === 0 ? (
        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">No frames to preview</div>
      ) : (
        <div className="space-y-3">
          {frames.length > 1 && (
            <div className="flex items-center justify-between gap-1">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" title="Previous frame" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="default" className="h-8 w-8" title={playing ? "Pause" : "Play"} onClick={toggle}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" title="Next frame" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant={loop ? "default" : "outline"} className="h-8 w-8" title="Loop" aria-pressed={loop} onClick={() => setLoop(!loop)}><Repeat className="h-4 w-4" /></Button>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                Order
                <select value={playbackOrder} onChange={(event) => setPlaybackOrder(event.target.value as typeof playbackOrder)}
                  className="h-7 max-w-24 rounded border border-input bg-background px-1 text-[10px]">
                  <option value="sequence">Sequence</option><option value="reverse">Reverse</option><option value="pingpong">Pingpong</option>
                </select>
              </label>
            </div>
          )}

          <div className="flex justify-center rounded border border-border bg-zinc-950 p-2">
            <PreviewCanvas sourceImage={currentImage?.bitmap ?? null} current={current} previous={previous} next={next}
              onionSkin={onionSkin && frames.length > 1} normalizeEnabled={normalizeEnabled} normalizeConfig={normalizeConfig} />
          </div>

          {frames.length > 1 ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  FPS
                  <input type="number" min={1} max={60} value={fpsDraft} onChange={(event) => setFpsDraft(event.target.value)} onBlur={commitFps}
                    onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                    className="h-7 w-14 rounded border border-input bg-background px-1.5 text-center font-mono text-foreground" />
                </label>
                <span className="font-mono">Frame {safeIndex + 1}/{orderedIds.length}</span>
              </div>
              {onionSkin && fps > 30 && <div className="text-[10px] text-muted-foreground" title="Onion-skin rendering is capped for performance.">Playback capped at 30 FPS while onion skin is enabled.</div>}
              <div className="flex flex-wrap gap-1">
                {[6, 8, 12, 24].map((value) => <Button key={value} type="button" size="sm" variant={fps === value ? "default" : "outline"}
                  className="h-6 px-2 text-[10px]" onClick={() => setFps(value)}>{value} FPS</Button>)}
              </div>
              <div className="space-y-1">
                <input type="range" min={0} max={Math.max(0, orderedIds.length - 1)} step={1} value={safeIndex} list="animation-frame-ticks"
                  onChange={(event) => seek(Number(event.target.value))} className="w-full accent-primary" aria-label="Animation frame scrubber" />
                <datalist id="animation-frame-ticks">{orderedIds.map((_, index) => <option key={index} value={index} />)}</datalist>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  {orderedIds.map((_, index) => <span key={index}>{index + 1}</span>)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={onionSkin} onChange={(event) => setOnionSkin(event.target.checked)} />
                Onion skin
              </label>
            </>
          ) : current ? <div className="text-center text-xs text-muted-foreground">Frame 1/1</div> : null}
        </div>
      ))}
    </section>
  );
}
