import { useEffect, useRef, useState } from "react";
import type { Frame } from "@/store/useFrameStore";

interface FrameContextMenuProps {
  frame: Frame;
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSplit: (axis: "h" | "v") => void;
  onRename: (label?: string) => void;
  onReset: () => void;
}

export function FrameContextMenu({ frame, x, y, onClose, onDuplicate, onDelete, onSplit, onRename, onReset }: FrameContextMenuProps) {
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(frame.label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) inputRef.current?.focus(); }, [renaming]);
  const itemClass = "block w-full px-3 py-1.5 text-left text-xs hover:bg-accent";
  const run = (action: () => void) => { action(); onClose(); };
  return <div role="menu" data-frame-context-menu className="absolute z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
    style={{ left: x, top: y }} onMouseDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
    <button className={itemClass} onClick={() => run(onDuplicate)}>Duplicate</button>
    <button className={itemClass} onClick={() => run(onDelete)}>Delete</button>
    <button className={itemClass} onClick={() => run(() => onSplit("h"))}>Split H</button>
    <button className={itemClass} onClick={() => run(() => onSplit("v"))}>Split V</button>
    {renaming ? <form className="flex gap-1 p-1" onSubmit={(event) => { event.preventDefault(); run(() => onRename(label || undefined)); }}>
      <input ref={inputRef} className="min-w-0 flex-1 rounded border bg-background px-1.5 py-1 text-xs" value={label} onChange={(event) => setLabel(event.target.value)} />
      <button className="rounded px-1 text-xs hover:bg-accent" type="submit">OK</button>
    </form> : <button className={itemClass} onClick={() => setRenaming(true)}>Rename</button>}
    <button className={itemClass} onClick={() => run(onReset)}>Reset</button>
  </div>;
}
