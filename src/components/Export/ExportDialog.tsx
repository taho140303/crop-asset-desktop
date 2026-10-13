import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportProgress } from "@/components/Export/ExportProgress";
import { ExportTreePreview } from "@/components/Export/ExportTreePreview";
import { sanitizeAnimationName } from "@/lib/exporter";
import { computeFrames, useFrameStore, type Frame } from "@/store/useFrameStore";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { useImageStore } from "@/store/useImageStore";
import { useNormalizeStore } from "@/store/useNormalizeStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useExportStore } from "@/store/useExportStore";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open: isOpen, onClose }: ExportDialogProps) {
  const currentImage = useImageStore((state) => state.currentImage);
  const { mode, config: gridConfig } = useGridStore();
  const manualFrames = useFrameStore((state) => state.frames);
  const detectedFrames = useAutoDetectStore((state) => state.detectedFrames);
  const normalizeEnabled = useNormalizeStore((state) => state.enabled);
  const normalizeConfig = useNormalizeStore((state) => state.config);
  const fps = usePlayerStore((state) => state.fps);
  const loop = usePlayerStore((state) => state.loop);
  const { config, setConfig, startExport, isExporting } = useExportStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const frames = useMemo<Frame[]>(() => mode === "manual" ? manualFrames
    : mode === "auto" ? detectedFrames.map((frame, index) => ({ id: `auto-${index}`, ...frame }))
      : computeFrames(gridConfig), [mode, manualFrames, detectedFrames, gridConfig]);
  const normalizedName = sanitizeAnimationName(config.animName);
  const nameIsChanged = config.animName.trim() !== normalizedName;
  const nameInvalid = config.animName.trim().length === 0 || normalizedName.length === 0;
  const exportDisabled = !currentImage || frames.length === 0 || !config.outputDir?.trim() || nameInvalid || isExporting;

  useEffect(() => {
    if (!isOpen || isExporting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isExporting, onClose]);

  const chooseFolder = async () => {
    setLocalError(null);
    try {
      const selected = await open({ directory: true, multiple: false, title: "Choose export folder" });
      if (typeof selected === "string") setConfig({ outputDir: selected });
    } catch (error) {
      setLocalError(`Folder picker is available in the desktop app. ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runExport = async () => {
    if (exportDisabled || !currentImage || !config.outputDir) return;
    setLocalError(null);
    let sourceBitmap: ImageBitmap | null = null;
    try {
      sourceBitmap = await createImageBitmap(currentImage.bitmap);
      await startExport({
        frames,
        sourceBitmap,
        normalizeEnabled,
        normalizeConfig,
        exportConfig: { ...config, animName: normalizedName },
        fps,
        loop,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    } finally {
      sourceBitmap?.close();
    }
  };

  if (!isOpen) return null;

  const animationFolder = config.perAnimFolder ? normalizedName || "<animation>" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isExporting) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Export frames" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-5 text-card-foreground shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Export frames</h2>
            <p className="text-xs text-muted-foreground">Export {frames.length} frame{frames.length === 1 ? "" : "s"} from the current slicing mode.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isExporting} aria-label="Close export dialog" className="rounded p-1 hover:bg-accent disabled:opacity-40"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5">
          <section className="space-y-2" aria-label="Output settings">
            <h3 className="text-xs font-semibold">1. Output</h3>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={chooseFolder}>Choose folder…</Button>
              <input aria-label="Output directory path" value={config.outputDir ?? ""} onChange={(event) => setConfig({ outputDir: event.target.value || null })}
                placeholder="Output directory path" className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.perAnimFolder} onChange={(event) => setConfig({ perAnimFolder: event.target.checked })} />Per-animation subfolder</label>
          </section>

          <section className="space-y-2" aria-label="Format settings">
            <h3 className="text-xs font-semibold">2. Format</h3>
            <div className="flex flex-wrap gap-4">
              {(["png-sequence", "sprite-sheet", "both"] as const).map((format) => (
                <label key={format} className="flex items-center gap-1.5 text-xs">
                  <input type="radio" name="export-format" checked={config.format === format} onChange={() => setConfig({ format })} />
                  {format === "png-sequence" ? "PNG Sequence" : format === "sprite-sheet" ? "Sprite Sheet" : "Both"}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <span>Animation name:</span>
              <input value={config.animName} onChange={(event) => setConfig({ animName: event.target.value })}
                className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono" />
            </label>
            {nameIsChanged && !nameInvalid && <p className="text-[11px] text-amber-600">Will use sanitized name: <span className="font-mono">{normalizedName}</span></p>}
            {nameInvalid && <p className="text-[11px] text-red-500">Enter an animation name containing letters or numbers.</p>}
          </section>

          <section className="space-y-2" aria-label="Export options">
            <h3 className="text-xs font-semibold">3. Options</h3>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.exportMetadata} onChange={(event) => setConfig({ exportMetadata: event.target.checked })} />Export metadata.json</label>
            {config.format !== "png-sequence" && !config.exportMetadata && <p className="pl-6 text-[10px] text-muted-foreground">A minimal meta.json is still required as the sprite-sheet atlas.</p>}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.skipEmptyFrames} onChange={(event) => setConfig({ skipEmptyFrames: event.target.checked })} />Skip fully transparent frames</label>
            <label className="flex items-center gap-2 text-xs">
              <span>Padding:</span>
              <input type="number" min={0} max={256} step={1} value={config.sheetPadding} onChange={(event) => setConfig({ sheetPadding: Math.max(0, Math.min(256, Math.round(Number(event.target.value) || 0))) })}
                className="h-7 w-16 rounded-md border border-input bg-background px-2 font-mono" />
              <span>px</span>
            </label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.sheetPowerOfTwo} onChange={(event) => setConfig({ sheetPowerOfTwo: event.target.checked })} />Power-of-two sheet size</label>
          </section>

          <ExportTreePreview config={config} frames={frames} />
          <ExportProgress />
          {localError && <div role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-600">{localError}</div>}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={isExporting ? () => useExportStore.getState().cancelExport() : onClose}>
              {isExporting ? "Cancel export" : "Cancel"}
            </Button>
            <Button type="button" disabled={exportDisabled} title={frames.length === 0 ? "No frames to export" : undefined} onClick={runExport}>
              {isExporting ? "Exporting…" : "Export"}
            </Button>
          </div>
          {animationFolder && config.outputDir && <div className="sr-only">Output subfolder: {animationFolder}</div>}
        </div>
      </div>
    </div>
  );
}
