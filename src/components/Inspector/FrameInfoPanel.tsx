import { useFrameStore } from "@/store/useFrameStore";
import { useGridStore } from "@/store/useGridStore";
import { computeFrames, type Frame } from "@/store/useFrameStore";
import { useAutoDetectStore } from "@/store/useAutoDetectStore";

export function FrameInfoPanel() {
  const { mode, config } = useGridStore();
  const { frames, selectedIds, updateFrame } = useFrameStore();
  const { detectedFrames } = useAutoDetectStore();
  const visibleFrames: Frame[] = mode === "manual" ? frames
    : mode === "auto" ? detectedFrames.map((box, index) => ({ id: `auto-${index}`, ...box }))
      : computeFrames(config);
  const frame = visibleFrames.find((item) => selectedIds.includes(item.id));
  if (!frame) return <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
    {selectedIds.length > 1 ? `${selectedIds.length} frames selected` : "Select a frame to inspect it."}
  </div>;
  const editable = mode === "manual";
  const setNumber = (field: "x" | "y" | "w" | "h", value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) updateFrame(frame.id, { [field]: parsed });
  };
  return <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
    <label className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">Label</span>
      {editable ? <input className="h-7 w-36 rounded border bg-background px-2" value={frame.label ?? ""}
        placeholder={`Frame ${frames.findIndex((item) => item.id === frame.id) + 1}`}
        onChange={(event) => updateFrame(frame.id, { label: event.target.value || undefined })} />
        : <span>{frame.label ?? `Frame ${frame.id}`}</span>}
    </label>
    <div className="grid grid-cols-2 gap-2">
      {(["x", "y", "w", "h"] as const).map((field) => <label key={field} className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>{field.toUpperCase()}</span>
        {editable ? <input type="number" min={field === "w" || field === "h" ? 4 : undefined}
          className="h-7 w-20 rounded border bg-background px-2 font-mono text-foreground"
          value={frame[field]} onChange={(event) => setNumber(field, event.target.value)} />
          : <span className="font-mono text-foreground">{frame[field]} px</span>}
      </label>)}
    </div>
  </div>;
}
