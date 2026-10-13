import { useImageStore } from "@/store/useImageStore";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  Sparkles,
} from "lucide-react";

interface CanvasToolbarProps {
  containerWidth: number;
  containerHeight: number;
}

export function CanvasToolbar({
  containerWidth,
  containerHeight,
}: CanvasToolbarProps) {
  const { viewport, zoomIn, zoomOut, resetZoom, fitToScreen, currentImage } =
    useImageStore();
  const { mode, getFrames } = useGridStore();
  const { detectedFrames } = useAutoDetectStore();

  const zoomPercent = Math.round(viewport.scale * 100);

  // Frames count based on mode
  const framesCount =
    mode === "auto" ? detectedFrames.length : getFrames().length;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
      {/* Frames Info Badge */}
      {currentImage && (
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/85 px-3 py-1.5 shadow-md backdrop-blur-md text-xs text-foreground">
          {mode === "auto" ? (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
          <span className="font-semibold">{framesCount}</span> frames detected
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Total size:</span>
          <span className="font-mono text-muted-foreground">
            {currentImage.width}×{currentImage.height}
          </span>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/85 p-1 shadow-md backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground hover:bg-muted"
          onClick={zoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="min-w-14 text-center font-mono text-xs font-semibold text-foreground">
          {zoomPercent}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground hover:bg-muted"
          onClick={zoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-foreground hover:bg-muted"
          onClick={resetZoom}
          title="Reset Zoom to 100%"
        >
          <Scan className="mr-1 h-3.5 w-3.5" />
          1:1
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-foreground hover:bg-muted"
          onClick={() => fitToScreen(containerWidth, containerHeight)}
          title="Fit to Screen"
        >
          <Maximize2 className="mr-1 h-3.5 w-3.5" />
          Fit
        </Button>
      </div>
    </div>
  );
}
