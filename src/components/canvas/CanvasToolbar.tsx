import { Maximize2, Minus, Plus, RotateCcw, Layers } from "lucide-react";
import { useImageStore } from "@/store/useImageStore";
import { useGridStore } from "@/store/useGridStore";

interface CanvasToolbarProps {
  containerWidth: number;
  containerHeight: number;
}

export function CanvasToolbar({ containerWidth, containerHeight }: CanvasToolbarProps) {
  const currentImage = useImageStore((state) => state.currentImage);
  const viewport = useImageStore((state) => state.viewport);
  const setViewport = useImageStore((state) => state.setViewport);
  const fitToScreen = useImageStore((state) => state.fitToScreen);

  const config = useGridStore((state) => state.config);
  const frames = useGridStore((state) => state.getFrames)();

  const zoomPercent = Math.round(viewport.scale * 100);

  // Compute total bounding size of the grid slice
  // Total Width = offX + cols * fw + (cols - 1) * gapX
  // Total Height = offY + rows * fh + (rows - 1) * gapY
  const totalW = config.cols > 0 ? config.cols * config.fw + (config.cols - 1) * config.gapX : 0;
  const totalH = config.rows > 0 ? config.rows * config.fh + (config.rows - 1) * config.gapY : 0;

  const handleZoomIn = () => {
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const newScale = Math.min(16, viewport.scale * 1.25);

    const imgX = (centerX - viewport.offsetX) / viewport.scale;
    const imgY = (centerY - viewport.offsetY) / viewport.scale;

    setViewport({
      scale: newScale,
      offsetX: centerX - imgX * newScale,
      offsetY: centerY - imgY * newScale,
    });
  };

  const handleZoomOut = () => {
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const newScale = Math.max(0.25, viewport.scale / 1.25);

    const imgX = (centerX - viewport.offsetX) / viewport.scale;
    const imgY = (centerY - viewport.offsetY) / viewport.scale;

    setViewport({
      scale: newScale,
      offsetX: centerX - imgX * newScale,
      offsetY: centerY - imgY * newScale,
    });
  };

  const handleReset1to1 = () => {
    if (!currentImage) {
      setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
      return;
    }
    const newOffsetX = (containerWidth - currentImage.width) / 2;
    const newOffsetY = (containerHeight - currentImage.height) / 2;
    setViewport({
      scale: 1,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  const handleFit = () => {
    fitToScreen(containerWidth, containerHeight);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none select-none">
      {/* Bottom Left: Frames info & total size */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border/80 bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur text-xs">
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <Layers className="size-3.5 text-primary" />
          <span>{frames.length} frames detected</span>
        </div>
        <span className="text-muted-foreground/60">•</span>
        <div className="text-muted-foreground font-mono">
          Total size: <span className="text-foreground">{totalW}×{totalH}px</span>
        </div>
        {currentImage && (
          <>
            <span className="text-muted-foreground/60">•</span>
            <div className="text-muted-foreground font-mono text-[11px]">
              Image: {currentImage.width}×{currentImage.height}px
            </div>
          </>
        )}
      </div>

      {/* Bottom Right: Zoom controls */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur">
        <span className="min-w-[48px] px-1 text-center font-mono text-xs font-semibold text-foreground">
          {zoomPercent}%
        </span>

        <div className="h-3.5 w-px bg-border" />

        <button
          onClick={handleZoomOut}
          disabled={viewport.scale <= 0.25}
          title="Zoom Out (Wheel Down)"
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 transition-colors"
        >
          <Minus className="size-3.5" />
        </button>

        <button
          onClick={handleZoomIn}
          disabled={viewport.scale >= 16}
          title="Zoom In (Wheel Up)"
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 transition-colors"
        >
          <Plus className="size-3.5" />
        </button>

        <div className="h-3.5 w-px bg-border" />

        <button
          onClick={handleReset1to1}
          disabled={!currentImage}
          title="1:1 Original Pixel Size"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 transition-colors"
        >
          <RotateCcw className="size-3" />
          <span>1:1</span>
        </button>

        <button
          onClick={handleFit}
          disabled={!currentImage}
          title="Fit to Screen"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 transition-colors"
        >
          <Maximize2 className="size-3" />
          <span>Fit</span>
        </button>
      </div>
    </div>
  );
}
