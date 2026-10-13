import { useMemo, useState } from "react";
import { useGridStore } from "@/store/useGridStore";
import { useImageStore } from "@/store/useImageStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { computeFrames, useFrameStore, type Frame } from "@/store/useFrameStore";
import { FrameInfoPanel } from "@/components/Inspector/FrameInfoPanel";
import { NormalizePanel } from "@/components/Inspector/NormalizePanel";
import { NormalizePreviewStrip } from "@/components/Inspector/NormalizePreviewStrip";
import { AnimationPreviewPanel } from "@/components/Preview/AnimationPreviewPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Grid,
  Sparkles,
  Maximize2,
  Layers,
  RefreshCw,
  Check,
  AlertTriangle,
  Pencil,
} from "lucide-react";

export function RightInspector() {
  const { currentImage } = useImageStore();
  const {
    mode,
    config,
    setMode,
    updateConfig,
    applyPreset,
    autoFillFromImage,
  } = useGridStore();
  const {
    frames: manualFrames,
    selectedIds: selectedFrameIds,
    setFrames,
    selectFrames,
    addFrame,
    alignFrames,
    mergeFrames,
  } = useFrameStore();

  const {
    config: autoConfig,
    detectedFrames,
    isDetecting,
    hasNoAlphaWarning,
    lastDetectionDuration,
    setConfig: setAutoConfig,
    runDetection,
  } = useAutoDetectStore();

  const selectedCount = selectedFrameIds.length;
  const [exceededFrames, setExceededFrames] = useState<Frame[]>([]);
  const visibleFrames = useMemo<Frame[]>(() => mode === "manual" ? manualFrames
    : mode === "auto" ? detectedFrames.map((frame, index) => ({ id: `auto-${index}`, ...frame }))
      : computeFrames(config), [mode, manualFrames, detectedFrames, config]);

  const handleInputChange = (field: keyof typeof config, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateConfig({ [field]: Math.max(0, num) });
    }
  };

  const presets = [
    { label: "1×4", r: 1, c: 4 },
    { label: "1×6", r: 1, c: 6 },
    { label: "1×8", r: 1, c: 8 },
    { label: "2×4", r: 2, c: 4 },
    { label: "3×3", r: 3, c: 3 },
    { label: "4×4", r: 4, c: 4 },
  ];

  const handleRunAutoDetect = () => {
    if (currentImage?.bitmap) {
      runDetection(currentImage.bitmap);
    }
  };

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l border-border bg-card text-card-foreground overflow-y-auto"
      aria-label="Inspector"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Grid & Slicing
        </h2>
        {currentImage && (
          <span className="text-[11px] text-muted-foreground">
            {currentImage.width}×{currentImage.height}
          </span>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Mode Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Slicing Mode
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("uniform")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "uniform"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Uniform
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("auto");
                if (detectedFrames.length === 0 && currentImage?.bitmap) {
                  runDetection(currentImage.bitmap);
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "auto"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Auto Detect
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode !== "manual" && manualFrames.length === 0) {
                  const sourceFrames = mode === "auto"
                    ? detectedFrames.map((frame) => frame)
                    : computeFrames(config);
                  setFrames(sourceFrames.map((frame, index) => ({ id: `manual-${index + 1}`, x: frame.x, y: frame.y, w: frame.w, h: frame.h })));
                  selectFrames([]);
                }
                setMode("manual");
              }}
              className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${mode === "manual" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Manual
            </button>
          </div>
          {mode === "manual" && (
            <div className="mt-1 space-y-2">
              <div className="flex items-center justify-between rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-400">
                <span>Mode: Manual Edit ({manualFrames.length} frames)</span>
                <button onClick={() => setMode("uniform")} className="underline hover:text-amber-300">Reset</button>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs"
                onClick={() => addFrame({ x: 0, y: 0, w: config.fw, h: config.fh })}>Add Frame</Button>
            </div>
          )}
        </div>

        {/* UNIFORM GRID SECTION */}
        {mode === "uniform" && (
          <div className="space-y-4">
            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Presets
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((p) => {
                  const isActive =
                    config.rows === p.r && config.cols === p.c;
                  return (
                    <Button
                      key={p.label}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs font-mono"
                      onClick={() =>
                        applyPreset(
                          p.r,
                          p.c,
                          currentImage?.width,
                          currentImage?.height
                        )
                      }
                    >
                      {p.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Auto-fill Button */}
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs gap-1.5"
              disabled={!currentImage}
              onClick={() => {
                if (currentImage) {
                  autoFillFromImage(currentImage.width, currentImage.height);
                }
              }}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Auto-fill from image size
            </Button>

            {/* Grid Dimension Inputs */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Rows</label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 font-mono text-xs"
                    value={config.rows}
                    onChange={(e) => handleInputChange("rows", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Cols</label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 font-mono text-xs"
                    value={config.cols}
                    onChange={(e) => handleInputChange("cols", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Frame W (px)</label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 font-mono text-xs"
                    value={config.fw}
                    onChange={(e) => handleInputChange("fw", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Frame H (px)</label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 font-mono text-xs"
                    value={config.fh}
                    onChange={(e) => handleInputChange("fh", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Gap X (px)</label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 font-mono text-xs"
                    value={config.gapX}
                    onChange={(e) => handleInputChange("gapX", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Gap Y (px)</label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 font-mono text-xs"
                    value={config.gapY}
                    onChange={(e) => handleInputChange("gapY", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Offset X (px)</label>
                  <Input
                    type="number"
                    className="h-8 font-mono text-xs"
                    value={config.offX}
                    onChange={(e) => handleInputChange("offX", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Offset Y (px)</label>
                  <Input
                    type="number"
                    className="h-8 font-mono text-xs"
                    value={config.offY}
                    onChange={(e) => handleInputChange("offY", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUTO DETECT SECTION */}
        {mode === "auto" && (
          <div className="space-y-4">
            {hasNoAlphaWarning && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Ảnh không có alpha!</p>
                  <p className="mt-0.5 text-amber-300/80">
                    Ảnh không có alpha, dùng Uniform Grid
                  </p>
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Alpha Threshold</span>
                  <span className="font-mono text-foreground">{autoConfig.alphaThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={autoConfig.alphaThreshold}
                  onChange={(e) =>
                    setAutoConfig({ alphaThreshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Min Gap between frames</span>
                  <span className="font-mono text-foreground">{autoConfig.minGap} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={autoConfig.minGap}
                  onChange={(e) =>
                    setAutoConfig({ minGap: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Min Frame Size</span>
                  <span className="font-mono text-foreground">{autoConfig.minFrameSize} px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={autoConfig.minFrameSize}
                  onChange={(e) =>
                    setAutoConfig({ minFrameSize: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={autoConfig.mergeTouching}
                    onChange={(e) =>
                      setAutoConfig({ mergeTouching: e.target.checked })
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-primary accent-primary"
                  />
                  <span>Merge touching regions</span>
                </label>
              </div>
            </div>

            {/* Re-detect Button */}
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs gap-1.5"
              disabled={!currentImage || isDetecting}
              onClick={handleRunAutoDetect}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin" : ""}`} />
              {isDetecting ? "Detecting..." : "Re-detect"}
            </Button>

            {/* Detection Summary & Convert to Editable */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Frames detected:</span>
                <span className="font-mono font-semibold text-foreground">
                  {detectedFrames.length} frames
                </span>
              </div>
              {lastDetectionDuration > 0 && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Speed:</span>
                  <span className="font-mono">{lastDetectionDuration.toFixed(1)} ms</span>
                </div>
              )}

              {detectedFrames.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs gap-1.5"
                  onClick={() => {
                    setFrames(detectedFrames.map((frame, index) => ({ id: `frame-${index + 1}`, ...frame })));
                    selectFrames([]);
                    setMode("manual");
                  }}
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Convert to editable frames
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <NormalizePanel exceededFrames={exceededFrames} />
          <NormalizePreviewStrip frames={visibleFrames} sourceImage={currentImage?.bitmap ?? null} onValidationChange={setExceededFrames} />
        </div>

        <AnimationPreviewPanel />

        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-xs font-semibold">Frame Inspector · {selectedCount} selected</div>
          {mode === "manual" && selectedCount >= 2 && (
            <div className="grid grid-cols-3 gap-1">
              {([
                ["Left", "left"], ["Right", "right"], ["Top", "top"],
                ["Bottom", "bottom"], ["H-Center", "h-center"], ["V-Center", "v-center"],
              ] as const).map(([label, align]) => (
                <Button key={align} size="sm" variant="outline" className="h-7 px-1 text-[10px]"
                  onClick={() => alignFrames(align)}>{label}</Button>
              ))}
              <Button size="sm" variant="outline" className="col-span-3 h-7 text-[10px]"
                onClick={() => mergeFrames(selectedFrameIds)}>Merge selected</Button>
            </div>
          )}
          <FrameInfoPanel />
        </div>
      </div>
    </aside>
  );
}
