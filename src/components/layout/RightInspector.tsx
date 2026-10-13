import { useId } from "react";
import { Grid, Sparkles, Wand2, Info } from "lucide-react";
import { useGridStore } from "@/store/useGridStore";
import { useImageStore } from "@/store/useImageStore";

const PRESETS = [
  { label: "1×4", rows: 1, cols: 4 },
  { label: "1×6", rows: 1, cols: 6 },
  { label: "1×8", rows: 1, cols: 8 },
  { label: "2×4", rows: 2, cols: 4 },
  { label: "3×3", rows: 3, cols: 3 },
  { label: "4×4", rows: 4, cols: 4 },
];

export function RightInspector() {
  const rowsId = useId();
  const colsId = useId();
  const fwId = useId();
  const fhId = useId();
  const gapXId = useId();
  const gapYId = useId();
  const offXId = useId();
  const offYId = useId();

  const currentImage = useImageStore((state) => state.currentImage);
  const mode = useGridStore((state) => state.mode);
  const setMode = useGridStore((state) => state.setMode);
  const config = useGridStore((state) => state.config);
  const updateConfig = useGridStore((state) => state.updateConfig);
  const applyPreset = useGridStore((state) => state.applyPreset);
  const autoFillFromImage = useGridStore((state) => state.autoFillFromImage);
  const selectedFrameIds = useGridStore((state) => state.selectedFrameIds);
  const frames = useGridStore((state) => state.getFrames)();

  // Find selected frames details
  const selectedFrames = frames.filter((f) => selectedFrameIds.includes(f.id));
  const primarySelected = selectedFrames.length > 0 ? selectedFrames[0] : null;

  const handleNumberChange = (
    key: keyof typeof config,
    value: string,
    min = 0
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateConfig({ [key]: Math.max(min, num) });
    }
  };

  return (
    <aside
      className="w-72 shrink-0 border-l border-border bg-card flex flex-col text-card-foreground select-none overflow-y-auto"
      aria-label="Inspector"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <Grid className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inspector
          </h2>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Slicing Mode Toggle */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Slicing Mode
          </label>
          <div className="grid grid-cols-2 rounded-lg bg-muted/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setMode("uniform")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "uniform"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="size-3.5" />
              <span>Uniform Grid</span>
            </button>
            <button
              type="button"
              disabled
              title="Coming in next sprint"
              className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed"
            >
              <Sparkles className="size-3.5" />
              <span>Auto Detect</span>
            </button>
          </div>
        </div>

        {/* Grid Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Grid Presets
            </label>
            {currentImage && (
              <span className="text-[10px] text-muted-foreground/80 font-mono">
                {currentImage.width}×{currentImage.height}px
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  applyPreset(p.rows, p.cols, currentImage?.width, currentImage?.height)
                }
                className={`rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-colors ${
                  config.rows === p.rows && config.cols === p.cols
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : ""
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Auto-fill from image button */}
          <button
            type="button"
            disabled={!currentImage}
            onClick={() => {
              if (currentImage) {
                autoFillFromImage(currentImage.width, currentImage.height);
              }
            }}
            className="w-full mt-1.5 flex items-center justify-center gap-2 rounded-md border border-border/70 bg-secondary/50 hover:bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Wand2 className="size-3.5 text-primary" />
            <span>Auto-fill from image size</span>
          </button>
        </div>

        {/* Grid Dimensions & Layout */}
        <div className="space-y-3 border-t border-border/60 pt-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Grid Config
          </label>

          {/* Rows & Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor={rowsId}
                className="text-xs text-muted-foreground"
              >
                Rows
              </label>
              <input
                id={rowsId}
                type="number"
                min={1}
                value={config.rows}
                onChange={(e) => handleNumberChange("rows", e.target.value, 1)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={colsId}
                className="text-xs text-muted-foreground"
              >
                Cols
              </label>
              <input
                id={colsId}
                type="number"
                min={1}
                value={config.cols}
                onChange={(e) => handleNumberChange("cols", e.target.value, 1)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Frame Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor={fwId}
                className="text-xs text-muted-foreground"
              >
                Frame W (px)
              </label>
              <input
                id={fwId}
                type="number"
                min={1}
                value={config.fw}
                onChange={(e) => handleNumberChange("fw", e.target.value, 1)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={fhId}
                className="text-xs text-muted-foreground"
              >
                Frame H (px)
              </label>
              <input
                id={fhId}
                type="number"
                min={1}
                value={config.fh}
                onChange={(e) => handleNumberChange("fh", e.target.value, 1)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Gap X & Gap Y */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor={gapXId}
                className="text-xs text-muted-foreground"
              >
                Gap X (px)
              </label>
              <input
                id={gapXId}
                type="number"
                min={0}
                value={config.gapX}
                onChange={(e) => handleNumberChange("gapX", e.target.value, 0)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={gapYId}
                className="text-xs text-muted-foreground"
              >
                Gap Y (px)
              </label>
              <input
                id={gapYId}
                type="number"
                min={0}
                value={config.gapY}
                onChange={(e) => handleNumberChange("gapY", e.target.value, 0)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Offset X & Offset Y */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor={offXId}
                className="text-xs text-muted-foreground"
              >
                Offset X (px)
              </label>
              <input
                id={offXId}
                type="number"
                value={config.offX}
                onChange={(e) => handleNumberChange("offX", e.target.value, -9999)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={offYId}
                className="text-xs text-muted-foreground"
              >
                Offset Y (px)
              </label>
              <input
                id={offYId}
                type="number"
                value={config.offY}
                onChange={(e) => handleNumberChange("offY", e.target.value, -9999)}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Selected Frame Inspector */}
        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Frame Info
            </label>
            {selectedFrames.length > 0 && (
              <span className="text-[11px] font-medium text-primary">
                {selectedFrames.length} selected
              </span>
            )}
          </div>

          {primarySelected ? (
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-semibold text-foreground">
                  Frame #{primarySelected.index + 1}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Row {primarySelected.row + 1}, Col {primarySelected.col + 1}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Position: </span>
                  <span className="font-mono text-foreground">
                    ({primarySelected.x}, {primarySelected.y})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Size: </span>
                  <span className="font-mono text-foreground">
                    {primarySelected.w} × {primarySelected.h}
                  </span>
                </div>
              </div>
              {selectedFrames.length > 1 && (
                <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/30">
                  + {selectedFrames.length - 1} other frames selected
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-muted-foreground">
              <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground/60" />
              <p className="text-xs leading-relaxed">
                Click any frame on the canvas to inspect its details. Hold Shift to select multiple, or Ctrl+A to select all.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
