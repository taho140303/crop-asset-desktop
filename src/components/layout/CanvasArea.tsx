import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import { UploadCloud } from "lucide-react";
import { useImageStore } from "@/store/useImageStore";
import { useGridStore } from "@/store/useGridStore";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { GridOverlayLayer } from "@/components/canvas/GridOverlayLayer";

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const lastDragPos = useRef<{ x: number; y: number } | null>(null);

  const currentImage = useImageStore((state) => state.currentImage);
  const viewport = useImageStore((state) => state.viewport);
  const setViewport = useImageStore((state) => state.setViewport);
  const zoomToPoint = useImageStore((state) => state.zoomToPoint);
  const fitToScreen = useImageStore((state) => state.fitToScreen);
  const loadImage = useImageStore((state) => state.loadImage);
  const loadFile = useImageStore((state) => state.loadFile);

  // Grid Store
  const frames = useGridStore((state) => state.getFrames)();
  const selectedFrameIds = useGridStore((state) => state.selectedFrameIds);
  const hoveredFrameId = useGridStore((state) => state.hoveredFrameId);
  const selectFrame = useGridStore((state) => state.selectFrame);
  const selectAllFrames = useGridStore((state) => state.selectAllFrames);
  const clearSelection = useGridStore((state) => state.clearSelection);
  const setHoveredFrame = useGridStore((state) => state.setHoveredFrame);

  // ResizeObserver to track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When a new image is loaded, auto-fit to screen
  useEffect(() => {
    if (currentImage && size.width > 0 && size.height > 0) {
      fitToScreen(size.width, size.height);
    }
  }, [currentImage?.path, size.width, size.height, fitToScreen]);

  // Keyboard listener: Space for pan, Ctrl+A / Cmd+A to select all frames
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        selectAllFrames();
      }

      if (e.key === "Escape") {
        clearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsDraggingCanvas(false);
        lastDragPos.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectAllFrames, clearSelection]);

  // Tauri Native Drag and Drop listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupTauriDnd = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDragOver(true);
          } else if (event.payload.type === "drop") {
            setIsDragOver(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              loadImage(paths[0]);
            }
          } else if (event.payload.type === "leave") {
            setIsDragOver(false);
          }
        });
      } catch {
        // Not running in Tauri environment, web DnD will take care of it
      }
    };

    setupTauriDnd();

    return () => {
      if (unlisten) unlisten();
    };
  }, [loadImage]);

  // HTML5 Web Drag and Drop fallback handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      loadFile(files[0]);
    }
  };

  // Wheel zoom handler: Zoom to cursor position, clamp 0.25x - 16x
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newScale = direction > 0 ? viewport.scale * zoomFactor : viewport.scale / zoomFactor;

    zoomToPoint(newScale, e.clientX, e.clientY, {
      left: rect.left,
      top: rect.top,
    });
  };

  // Mouse pan handlers: Space+Left Click OR Middle Click
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1: Middle button (button === 1) or Space + Left button (button === 0)
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      lastDragPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas || !lastDragPos.current) return;

    const dx = e.clientX - lastDragPos.current.x;
    const dy = e.clientY - lastDragPos.current.y;

    lastDragPos.current = { x: e.clientX, y: e.clientY };

    setViewport((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    lastDragPos.current = null;
  };

  // Stage background click handler to clear selection when clicking empty space
  const handleStageClick = useCallback(
    (e: any) => {
      // If clicked on Stage itself or background rect
      if (e.target === e.target.getStage() || e.target.name() === "bg-canvas") {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // Determine cursor styling
  let cursorClass = "cursor-default";
  if (isDraggingCanvas) {
    cursorClass = "cursor-grabbing";
  } else if (isSpacePressed) {
    cursorClass = "cursor-grab";
  }

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative min-w-0 flex-1 overflow-hidden bg-zinc-950 select-none ${cursorClass}`}
    >
      {/* Canvas Area */}
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          className="block"
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          {/* Background Layer */}
          <Layer>
            <Rect
              name="bg-canvas"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#09090b"
            />
          </Layer>

          {/* Main Content Layer (Zoomed & Panned) */}
          <Layer
            x={viewport.offsetX}
            y={viewport.offsetY}
            scaleX={viewport.scale}
            scaleY={viewport.scale}
            listening={false}
          >
            {currentImage && (
              <>
                {/* Image bounding backdrop */}
                <Rect
                  x={0}
                  y={0}
                  width={currentImage.width}
                  height={currentImage.height}
                  fill="#18181b"
                  shadowColor="black"
                  shadowBlur={20}
                  shadowOpacity={0.6}
                />

                {/* Konva Image with NEAREST NEIGHBOR (pixelated) rendering */}
                <KonvaImage
                  image={currentImage.bitmap}
                  x={0}
                  y={0}
                  width={currentImage.width}
                  height={currentImage.height}
                  imageSmoothingEnabled={false}
                />

                {/* Thin pixel grid boundary border */}
                <Rect
                  x={0}
                  y={0}
                  width={currentImage.width}
                  height={currentImage.height}
                  stroke="#3f3f46"
                  strokeWidth={1 / viewport.scale}
                />
              </>
            )}
          </Layer>

          {/* Grid Overlay Layer */}
          {currentImage && (
            <GridOverlayLayer
              frames={frames}
              selectedFrameIds={selectedFrameIds}
              hoveredFrameId={hoveredFrameId}
              scale={viewport.scale}
              offsetX={viewport.offsetX}
              offsetY={viewport.offsetY}
              onSelectFrame={selectFrame}
              onHoverFrame={setHoveredFrame}
            />
          )}
        </Stage>
      )}

      {/* Empty State / Drag-drop guide */}
      {!currentImage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-none">
          <div className="flex flex-col items-center max-w-sm text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40 border border-border/60 text-muted-foreground shadow-sm">
              <UploadCloud className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Drop AI Sprite Sheet Here
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag and drop any PNG, JPG, or WebP image here, or select a file from recent files in the sidebar.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80 bg-muted/20 px-3 py-1.5 rounded-md border border-border/40">
              <span>Scroll to zoom</span>
              <span>•</span>
              <span>Space + Drag to pan</span>
            </div>
          </div>
        </div>
      )}

      {/* Drag Over Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary backdrop-blur-[2px] pointer-events-none">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card/90 p-6 shadow-2xl border border-primary/40">
            <UploadCloud className="size-10 text-primary animate-bounce" />
            <span className="text-sm font-semibold text-foreground">
              Release to load sprite sheet
            </span>
          </div>
        </div>
      )}

      {/* Bottom Floating Toolbar: Fit, 1:1, Zoom in/out, Zoom %, and Frame count & size */}
      <CanvasToolbar
        containerWidth={size.width}
        containerHeight={size.height}
      />
    </main>
  );
}
