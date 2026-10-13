import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import { useImageStore } from "@/store/useImageStore";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { useFrameStore, type Frame } from "@/store/useFrameStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { FrameContextMenu } from "@/components/ContextMenu/FrameContextMenu";
import { BottomBar } from "@/components/Layout/BottomBar";
import { NormalizeOverlay } from "@/components/Canvas/NormalizeOverlay";
import { GridOverlayLayer } from "@/components/canvas/GridOverlayLayer";
import { KonvaEventObject } from "konva/lib/Node";
import { Loader2, UploadCloud, AlertCircle } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export function CanvasArea() {
  const containerRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const {
    currentImage,
    viewport,
    isLoading,
    error,
    setViewport,
    setPan,
    fitToScreen,
    loadImage,
    loadFile,
  } = useImageStore();

  const { mode, config } = useGridStore();
  const {
    selectFrame,
    clearSelection,
    frames,
    removeFrames,
    updateFrame,
    duplicateFrames,
    splitFrame,
  } = useFrameStore();
  const [contextMenu, setContextMenu] = useState<{ frame: Frame; x: number; y: number } | null>(null);
  useKeyboardShortcuts(containerRef, true);

  const { isDetecting, toastMessage, clearToast } = useAutoDetectStore();

  // Dragging state for pan
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // ResizeObserver to track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // When image loads, fit it to screen once
  useEffect(() => {
    if (currentImage && dimensions.width > 0 && dimensions.height > 0) {
      fitToScreen(dimensions.width, dimensions.height);
    }
  }, [currentImage?.path, currentImage?.name]);

  // Space key handling for Pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (e.key === "Escape") {
        clearSelection();
        setContextMenu(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [clearSelection]);

  // Tauri Drag-Drop support
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    try {
      const webview = getCurrentWebview();
      webview
        .onDragDropEvent((event) => {
          if (event.payload.type === "over" || event.payload.type === "enter") {
            setIsDragOver(true);
          } else if (event.payload.type === "drop") {
            setIsDragOver(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              loadImage(paths[0]);
            }
          } else {
            setIsDragOver(false);
          }
        })
        .then((fn) => {
          unlisten = fn;
        })
        .catch(() => {});
    } catch {
      // ignore
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, [loadImage]);

  // Web HTML Drag-drop fallback
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
    }
  };

  // Wheel zoom centered on cursor
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.15;
      const oldScale = viewport.scale;

      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const clampedScale = Math.min(Math.max(newScale, 0.25), 16.0);

      // Compute new offset to zoom centered at mouse pointer
      const mousePointTo = {
        x: (pointer.x - viewport.offsetX) / oldScale,
        y: (pointer.y - viewport.offsetY) / oldScale,
      };

      const newOffsetX = pointer.x - mousePointTo.x * clampedScale;
      const newOffsetY = pointer.y - mousePointTo.y * clampedScale;

      setViewport(clampedScale, newOffsetX, newOffsetY);
    },
    [viewport, setViewport]
  );

  // Pan handlers: Space+Left Click OR Middle Click
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const isMiddleClick = e.evt.button === 1;
    const isLeftClickWithSpace = e.evt.button === 0 && isSpacePressed;

    if (isMiddleClick || isLeftClickWithSpace) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      viewportStartRef.current = { x: viewport.offsetX, y: viewport.offsetY };
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return;
    const dx = e.evt.clientX - panStartRef.current.x;
    const dy = e.evt.clientY - panStartRef.current.y;
    setPan(viewportStartRef.current.x + dx, viewportStartRef.current.y + dy);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Deselect on empty canvas click
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // If clicking on Stage itself or background Rect, deselect all frames
    if (e.target === e.target.getStage() || e.target.name() === "background-rect") {
      clearSelection();
    }
  };

  const cursorClass = isPanning
    ? "cursor-grabbing"
    : isSpacePressed
    ? "cursor-grab"
    : "cursor-default";

  const openFrameContextMenu = (frame: Frame, clientX: number, clientY: number) => {
    if (mode !== "manual" || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    selectFrame(frame.id);
    setContextMenu({ frame, x: clientX - bounds.left, y: clientY - bounds.top });
  };

  return (
    <main
      ref={containerRef}
      tabIndex={0}
      onPointerDown={(event) => {
        if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLButtonElement)) containerRef.current?.focus();
      }}
      onClick={(event) => { if (event.target === event.currentTarget) setContextMenu(null); }}
      onMouseDown={(event) => {
        if (contextMenu && !(event.target instanceof Element && event.target.closest("[data-frame-context-menu]"))) setContextMenu(null);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 overflow-hidden bg-zinc-950 select-none ${cursorClass}`}
      aria-label="Canvas Area"
    >
      {/* Toast Warning / Error */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-zinc-900/90 px-4 py-2.5 text-xs text-amber-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={clearToast}
            className="ml-2 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoading || isDetecting) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-2 text-xs font-medium text-foreground">
            {isLoading ? "Đang tải ảnh..." : "Đang detect frame boundaries..."}
          </span>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center border-2 border-dashed border-primary bg-primary/10 backdrop-blur-xs">
          <UploadCloud className="h-12 w-12 text-primary animate-bounce" />
          <span className="mt-3 text-sm font-semibold text-primary">
            Thả ảnh vào đây để mở
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">Không thể mở ảnh</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!currentImage && !isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-muted p-4 text-muted-foreground mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-medium text-foreground">
            Chưa có ảnh nào được mở
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Kéo thả file ảnh PNG sprite sheet vào đây hoặc bấm &quot;Open Image&quot; trên thanh công cụ để bắt đầu.
          </p>
        </div>
      )}

      {/* Konva Stage */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          className="absolute inset-0"
        >
          {/* Background click handler */}
          <Layer>
            <Rect
              name="background-rect"
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              fill="transparent"
            />
          </Layer>

          {/* Main Image Layer */}
          {currentImage && (
            <Layer
              x={viewport.offsetX}
              y={viewport.offsetY}
              scaleX={viewport.scale}
              scaleY={viewport.scale}
              imageSmoothingEnabled={false}
            >
              {/* Checkerboard backdrop for transparency */}
              <Rect
                x={0}
                y={0}
                width={currentImage.width}
                height={currentImage.height}
                fill="#18181b"
                stroke="#27272a"
                strokeWidth={1 / viewport.scale}
              />
              <KonvaImage
                image={currentImage.bitmap}
                width={currentImage.width}
                height={currentImage.height}
                imageSmoothingEnabled={false}
              />
            </Layer>
          )}

          {/* Grid Overlay Layer */}
          {currentImage && (
            <Layer
              x={viewport.offsetX}
              y={viewport.offsetY}
              scaleX={viewport.scale}
              scaleY={viewport.scale}
            >
              <GridOverlayLayer onContextMenu={openFrameContextMenu} />
            </Layer>
          )}
          {currentImage && (
            <Layer
              x={viewport.offsetX}
              y={viewport.offsetY}
              scaleX={viewport.scale}
              scaleY={viewport.scale}
              listening={false}
            >
              <NormalizeOverlay />
            </Layer>
          )}
        </Stage>
      )}

      {contextMenu && mode === "manual" && (
        <FrameContextMenu
          frame={frames.find((item) => item.id === contextMenu.frame.id) ?? contextMenu.frame}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateFrames([contextMenu.frame.id])}
          onDelete={() => removeFrames([contextMenu.frame.id])}
          onSplit={(axis) => splitFrame(contextMenu.frame.id, axis)}
          onRename={(label) => updateFrame(contextMenu.frame.id, { label })}
          onReset={() => updateFrame(contextMenu.frame.id, { w: config.fw, h: config.fh, label: undefined })}
        />
      )}

      {/* Canvas bottom controls */}
      <BottomBar
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
      />
    </main>
  );
}
