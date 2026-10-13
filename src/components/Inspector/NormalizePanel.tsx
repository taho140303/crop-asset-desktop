import { useEffect, useState } from "react";
import { useNormalizeStore, type NormalizeBackground } from "@/store/useNormalizeStore";
import type { Frame } from "@/store/useFrameStore";
import { Button } from "@/components/ui/button";

interface NormalizePanelProps {
  exceededFrames: Frame[];
}

const anchors = [
  ["bottom-center", "Bottom center"],
  ["bottom-left", "Bottom left"],
  ["center", "Center"],
  ["custom", "Custom"],
] as const;

function byte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(value: number) {
  return byte(value).toString(16).padStart(2, "0");
}

export function NormalizePanel({ exceededFrames }: NormalizePanelProps) {
  const { enabled, showBaselines, config, setConfig, toggleEnabled, setShowBaselines, reset } = useNormalizeStore();
  const [targetDraft, setTargetDraft] = useState({ targetW: String(config.targetW), targetH: String(config.targetH) });
  const { targetW, targetH, anchor } = config;
  useEffect(() => {
    setTargetDraft({ targetW: String(config.targetW), targetH: String(config.targetH) });
  }, [config.targetW, config.targetH]);
  const background = config.background;
  const color = background === "transparent" ? { r: 255, g: 0, b: 0, a: 255 } : background;
  const hexColor = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  const overflowNames = exceededFrames.map((frame) => frame.label?.trim() || frame.id);

  const setTarget = (field: "targetW" | "targetH", value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      setTargetDraft((draft) => ({ ...draft, [field]: String(config[field]) }));
      return;
    }
    const next = Math.max(16, Math.min(2048, Math.round(parsed)));
    setConfig({ [field]: next });
    setTargetDraft((draft) => ({ ...draft, [field]: String(next) }));
  };

  const setColor = (hex: string) => {
    const value = hex.replace("#", "");
    setConfig({ background: {
      r: parseInt(value.slice(0, 2), 16) || 0,
      g: parseInt(value.slice(2, 4), 16) || 0,
      b: parseInt(value.slice(4, 6), 16) || 0,
      a: color.a,
    } });
  };

  const setBackgroundMode = (mode: "transparent" | "color") => {
    const next: NormalizeBackground = mode === "transparent"
      ? "transparent"
      : (background === "transparent" ? { r: 255, g: 0, b: 0, a: 255 } : background);
    setConfig({ background: next });
  };

  return (
    <section className="space-y-3 border-t border-border pt-4" aria-label="Normalize preview settings">
      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
          Enable Normalize Preview
        </label>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={reset}>Reset</Button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {[128, 256, 512].map((size) => (
          <Button key={size} type="button" size="sm" variant={targetW === size && targetH === size ? "default" : "outline"}
            className="h-7 text-xs" onClick={() => setConfig({ targetW: size, targetH: size })}>{size}</Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["targetW", "targetH"] as const).map((field) => (
          <label key={field} className="space-y-1 text-[11px] text-muted-foreground">
            <span>{field === "targetW" ? "Target W" : "Target H"}</span>
            <input type="number" min={16} max={2048} step={1} value={targetDraft[field]}
              onChange={(event) => setTargetDraft((draft) => ({ ...draft, [field]: event.target.value }))}
              onBlur={(event) => setTarget(field, event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground" />
          </label>
        ))}
      </div>

      {exceededFrames.length > 0 && (
        <div className="inline-flex items-center rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500"
          title={`Frames exceeding target: ${overflowNames.join(", ")}`} role="status">
          {exceededFrames.length} frame{exceededFrames.length === 1 ? "" : "s"} exceed{exceededFrames.length === 1 ? "s" : ""} target
        </div>
      )}

      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Anchor</span>
        <select value={anchor} onChange={(event) => setConfig({ anchor: event.target.value as typeof anchor })}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          {anchors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {anchor === "custom" && (
        <div className="grid grid-cols-[1fr_96px] items-center gap-3 rounded border p-2">
          <div className="space-y-2">
            {(["customAnchorX", "customAnchorY"] as const).map((field) => (
              <label key={field} className="block space-y-1 text-[10px] text-muted-foreground">
                <span className="flex justify-between"><span>{field.endsWith("X") ? "Anchor X" : "Anchor Y"}</span><span>{config[field].toFixed(2)}</span></span>
                <input type="range" min={0} max={1} step={0.05} value={config[field]}
                  onChange={(event) => setConfig({ [field]: Number(event.target.value) })} className="w-full accent-primary" />
              </label>
            ))}
          </div>
          <div className="relative h-24 w-24 border border-dashed border-muted-foreground/60 bg-muted/30" aria-label="Custom anchor position preview">
            <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
              style={{ left: `${config.customAnchorX * 100}%`, top: `${config.customAnchorY * 100}%` }} />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={config.trimFirst} onChange={(event) => setConfig({ trimFirst: event.target.checked })} />
        Trim transparent edges first
      </label>
      <label className="flex items-center gap-2 text-xs" title="Aspect scaling is applied at export.">
        <input type="checkbox" checked={config.keepAspect} disabled readOnly />
        <span className="text-muted-foreground">Keep aspect ratio <span className="text-[10px]">(applied at export)</span></span>
      </label>

      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Background</span>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="normalize-background" checked={background === "transparent"} onChange={() => setBackgroundMode("transparent")} />Transparent</label>
          <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="normalize-background" checked={background !== "transparent"} onChange={() => setBackgroundMode("color")} />Color</label>
        </div>
        {background !== "transparent" && (
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Normalize background color" value={hexColor} onChange={(event) => setColor(event.target.value)} className="h-8 w-12 cursor-pointer rounded border bg-background p-0.5" />
            <label className="flex flex-1 items-center gap-2 text-[10px] text-muted-foreground">
              Alpha {color.a}
              <input type="range" min={0} max={255} step={1} value={color.a}
                onChange={(event) => setConfig({ background: { ...color, a: Number(event.target.value) } })} className="min-w-0 flex-1 accent-primary" />
            </label>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={showBaselines} onChange={(event) => setShowBaselines(event.target.checked)} />
        Show baselines
      </label>
    </section>
  );
}
