import React from "react";
import { Group, Rect, Text } from "react-konva";
import type { GridFrame } from "@/types/grid";

interface GridFrameItemProps {
  frame: GridFrame;
  isSelected: boolean;
  isHovered: boolean;
  scale: number;
  onSelect: (id: string, multiSelect: boolean) => void;
  onHover: (id: string | null) => void;
}

export const GridFrameItem = React.memo(function GridFrameItem({
  frame,
  isSelected,
  isHovered,
  scale,
  onSelect,
  onHover,
}: GridFrameItemProps) {
  // Border thickness adjusts with scale so it remains sharp and visible at any zoom
  const strokeWidth = isSelected ? 2 / scale : isHovered ? 1.5 / scale : 1 / scale;

  // Determine colors based on status:
  // - default: thin red (#ef4444)
  // - hover: bright yellow (#eab308) + slight yellow highlight tint
  // - selected: blue (#3b82f6) + handles
  const strokeColor = isSelected ? "#3b82f6" : isHovered ? "#eab308" : "#ef4444";
  const fillColor = isSelected
    ? "rgba(59, 130, 246, 0.15)"
    : isHovered
    ? "rgba(234, 179, 8, 0.12)"
    : "transparent";

  // Handle dimensions
  const handleSize = 6 / scale;
  const halfHandle = handleSize / 2;

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    const isShift = e.evt?.shiftKey || false;
    onSelect(frame.id, isShift);
  };

  const handleMouseEnter = () => {
    onHover(frame.id);
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  const fontSize = Math.max(9 / scale, 8);
  const badgePaddingX = 3 / scale;
  const badgePaddingY = 1.5 / scale;
  const badgeHeight = fontSize + badgePaddingY * 2;
  const badgeWidth = (frame.index + 1).toString().length * (fontSize * 0.65) + badgePaddingX * 2;

  return (
    <Group>
      {/* Frame boundary and hit detection */}
      <Rect
        x={frame.x}
        y={frame.y}
        width={frame.w}
        height={frame.h}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fillColor}
        onClick={handleClick}
        onTap={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Frame order number badge in top-left corner */}
      <Rect
        x={frame.x}
        y={frame.y}
        width={badgeWidth}
        height={badgeHeight}
        fill={isSelected ? "#2563eb" : isHovered ? "#ca8a04" : "#dc2626"}
        listening={false}
      />
      <Text
        x={frame.x + badgePaddingX}
        y={frame.y + badgePaddingY}
        text={`${frame.index + 1}`}
        fontSize={fontSize}
        fontFamily="monospace"
        fontStyle="bold"
        fill="#ffffff"
        listening={false}
      />

      {/* Selected handles at corners and center edges */}
      {isSelected && (
        <Group listening={false}>
          {/* Top-Left */}
          <Rect
            x={frame.x - halfHandle}
            y={frame.y - halfHandle}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1 / scale}
          />
          {/* Top-Right */}
          <Rect
            x={frame.x + frame.w - halfHandle}
            y={frame.y - halfHandle}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1 / scale}
          />
          {/* Bottom-Left */}
          <Rect
            x={frame.x - halfHandle}
            y={frame.y + frame.h - halfHandle}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1 / scale}
          />
          {/* Bottom-Right */}
          <Rect
            x={frame.x + frame.w - halfHandle}
            y={frame.y + frame.h - halfHandle}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1 / scale}
          />
        </Group>
      )}
    </Group>
  );
});
