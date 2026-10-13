import type { ExportSettings } from "@/store/useExportStore";
import { sanitizeAnimationName } from "@/lib/exporter";
import type { Frame } from "@/store/useFrameStore";

interface ExportTreePreviewProps {
  config: ExportSettings;
  frames: Frame[];
}

function frameName(animation: string, index: number) {
  return `${animation}_${String(index).padStart(2, "0")}.png`;
}

export function ExportTreePreview({ config, frames }: ExportTreePreviewProps) {
  const animation = sanitizeAnimationName(config.animName) || "<animation>";
  const root = config.outputDir?.trim() || "output/";
  const sequence = config.format !== "sprite-sheet";
  const sheet = config.format !== "png-sequence";
  const metadata = config.exportMetadata || sheet;
  const prefix = config.perAnimFolder ? `└── ${animation}/` : "";

  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-[11px]" aria-label="Export output tree">
      <div className="font-mono text-muted-foreground">{root}</div>
      {prefix && <div className="font-mono">{prefix}</div>}
      <div className={`space-y-0.5 font-mono ${prefix ? "pl-5" : "pl-2"}`}>
        {sequence && frames.map((_, index) => <div key={index}>├── {frameName(animation, index)}</div>)}
        {sheet && <div>├── {animation}_sheet.png</div>}
        {metadata && <div>└── meta.json</div>}
        {!sequence && !sheet && <div className="text-muted-foreground">No output files selected</div>}
        {config.skipEmptyFrames && <div className="pt-1 font-sans text-muted-foreground">Empty frames may be skipped during export.</div>}
      </div>
    </div>
  );
}
