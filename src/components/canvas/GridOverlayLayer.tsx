import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useGridStore } from "@/store/useGridStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";
import { useImageStore } from "@/store/useImageStore";
import { computeFrames, useFrameStore, type Frame } from "@/store/useFrameStore";

interface GridOverlayLayerProps {
  onContextMenu: (frame: Frame, clientX: number, clientY: number) => void;
}

export function GridOverlayLayer({ onContextMenu }: GridOverlayLayerProps) {
  const { mode, config } = useGridStore();
  const { detectedFrames } = useAutoDetectStore();
  const { viewport, currentImage } = useImageStore();
  const { frames: manualFrames, selectedIds, selectFrame, selectFrames, hoveredId, setHovered, updateFrame, updateFrames, duplicateFrames } = useFrameStore();
  const transformerRef = useRef<Konva.Transformer>(null);
  const rectRefs = useRef(new Map<string, Konva.Rect>());
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const marqueeStage = useRef<Konva.Stage | null>(null);
  const [altPreview, setAltPreview] = useState<Frame | null>(null);
  const altDragStart = useRef<{ frame: Frame; node: Konva.Rect } | null>(null);

  const visibleFrames: Frame[] = useMemo(() => {
    if (mode === "manual") return manualFrames;
    if (mode === "auto") return detectedFrames.map((bbox, index) => ({ id: `auto-${index}`, ...bbox }));
    return computeFrames(config);
  }, [mode, manualFrames, detectedFrames, config]);

  const editable = mode === "manual";
  const activeTransformerFrame = editable && selectedIds.length === 1 ? selectedIds[0] : null;

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = activeTransformerFrame ? rectRefs.current.get(activeTransformerFrame) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [activeTransformerFrame, visibleFrames]);

  const toImagePoint = useCallback((stage: Konva.Stage) => {
    const point = stage.getPointerPosition();
    if (!point) return null;
    return { x: (point.x - viewport.offsetX) / viewport.scale, y: (point.y - viewport.offsetY) / viewport.scale };
  }, [viewport]);

  useEffect(() => {
    if (!marquee) return;
    const onMove = (event: MouseEvent) => {
      const stage = marqueeStage.current;
      if (!stage) return;
      stage.setPointersPositions(event);
      const point = toImagePoint(stage);
      const start = marqueeStart.current;
      if (!point || !start) return;
      setMarquee({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) });
    };
    const onUp = () => {
      const area = marquee;
      const start = marqueeStart.current;
      if (area && start) {
        const intersecting = visibleFrames.filter((frame) =>
          frame.x <= area.x + area.w && frame.x + frame.w >= area.x &&
          frame.y <= area.y + area.h && frame.y + frame.h >= area.y
        ).map((frame) => frame.id);
        selectFrames(start.additive ? [...selectedIds, ...intersecting] : intersecting);
      }
      setMarquee(null);
      marqueeStart.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marquee, visibleFrames, selectedIds, selectFrames, toImagePoint]);

  const handleBackgroundDown = (event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0 || event.target.name() !== "frame-canvas-bg") return;
    const stage = event.target.getStage();
    if (!stage) return;
    marqueeStage.current = stage;
    const point = toImagePoint(stage);
    if (!point) return;
    marqueeStart.current = { ...point, additive: event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey };
    if (!marqueeStart.current.additive) selectFrames([]);
    setMarquee({ x: point.x, y: point.y, w: 0, h: 0 });
  };

  const handleDragStart = (frame: Frame, node: Konva.Rect, event: KonvaEventObject<DragEvent>) => {
    if (event.evt.altKey && editable) {
      altDragStart.current = { frame, node };
      setAltPreview({ ...frame });
    }
  };
  const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
    const pending = altDragStart.current;
    if (!pending) return;
    setAltPreview({ ...pending.frame, x: Math.round(event.target.x()), y: Math.round(event.target.y()) });
  };
  const handleDragEnd = (frame: Frame, node: Konva.Rect) => {
    const pending = altDragStart.current;
    if (pending) {
      const x = Math.round(node.x());
      const y = Math.round(node.y());
      node.position({ x: pending.frame.x, y: pending.frame.y });
      duplicateFrames([frame.id], x - pending.frame.x, y - pending.frame.y);
      altDragStart.current = null;
      setAltPreview(null);
      return;
    }
    const dx = Math.round(node.x()) - frame.x;
    const dy = Math.round(node.y()) - frame.y;
    const moved = selectedIds.includes(frame.id) ? selectedIds : [frame.id];
    updateFrames(manualFrames.filter((item) => moved.includes(item.id)).map((item) => ({ id: item.id, patch: { x: item.x + dx, y: item.y + dy } })));
    if (!selectedIds.includes(frame.id)) selectFrame(frame.id);
  };

  const finishTransform = (frame: Frame, node: Konva.Rect) => {
    const next = {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      w: Math.max(4, Math.round(node.width() * node.scaleX())),
      h: Math.max(4, Math.round(node.height() * node.scaleY())),
    };
    node.scale({ x: 1, y: 1 });
    updateFrame(frame.id, next);
  };

  return <>
    {currentImage && <Rect name="frame-canvas-bg" x={0} y={0} width={currentImage.width} height={currentImage.height}
      fill="rgba(0,0,0,0.001)" onMouseDown={handleBackgroundDown} />}
    {visibleFrames.map((frame, index) => {
      const selected = selectedIds.includes(frame.id);
      const hovered = hoveredId === frame.id;
      return <Fragment key={frame.id}>
        <Rect ref={(node) => { if (node) rectRefs.current.set(frame.id, node); else rectRefs.current.delete(frame.id); }}
          x={frame.x} y={frame.y} width={frame.w} height={frame.h}
          stroke={selected ? "#3b82f6" : hovered ? "#eab308" : "#ef4444"}
          strokeWidth={(selected ? 2 : 1) / viewport.scale}
          fill={selected ? "rgba(59,130,246,0.12)" : "rgba(0,0,0,0.001)"}
          draggable={editable} onClick={(event) => { event.cancelBubble = true; selectFrame(frame.id, event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey); }}
          onTap={(event) => { event.cancelBubble = true; selectFrame(frame.id, event.evt.shiftKey); }}
          onMouseEnter={() => setHovered(frame.id)} onMouseLeave={() => setHovered(null)}
          onContextMenu={(event) => { event.evt.preventDefault(); event.cancelBubble = true; selectFrame(frame.id); onContextMenu(frame, event.evt.clientX, event.evt.clientY); }}
          onDragStart={(event) => handleDragStart(frame, event.target as Konva.Rect, event)}
          onDragMove={handleDragMove}
          onDragEnd={(event) => handleDragEnd(frame, event.target as Konva.Rect)}
          onTransformEnd={(event) => finishTransform(frame, event.target as Konva.Rect)}
        />
        <Text x={frame.x + 3 / viewport.scale} y={frame.y + 2 / viewport.scale}
          text={frame.label || `${index + 1}`} fontSize={Math.max(9 / viewport.scale, 8)}
          fill="#fff" listening={false} />
      </Fragment>;
    })}
    {altPreview && <Rect x={altPreview.x} y={altPreview.y} width={altPreview.w} height={altPreview.h}
      stroke="#f59e0b" dash={[4 / viewport.scale, 3 / viewport.scale]} strokeWidth={2 / viewport.scale} listening={false} />}
    {marquee && <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(59,130,246,0.12)"
      stroke="#3b82f6" dash={[4 / viewport.scale, 3 / viewport.scale]} strokeWidth={1 / viewport.scale} listening={false} />}
    {activeTransformerFrame && <Transformer ref={transformerRef} rotateEnabled={false}
      enabledAnchors={["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]}
      keepRatio={false} shiftBehavior="default" anchorSize={8 / viewport.scale}
      boundBoxFunc={(oldBox, newBox) => newBox.width < 4 * viewport.scale || newBox.height < 4 * viewport.scale ? oldBox : newBox} />}
  </>;
}
