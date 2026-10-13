import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportStore } from "@/store/useExportStore";

export function ExportProgress() {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isExporting, progress, lastExportPath, lastResult, errors, cancelExport } = useExportStore();
  useEffect(() => { setDismissed(false); setShowDetails(false); }, [lastResult, isExporting]);
  if (!isExporting && (dismissed || (!lastResult && errors.length === 0))) return null;

  const percent = progress.total > 0 ? Math.max(0, Math.min(100, progress.current / progress.total * 100)) : 0;
  const failures = errors.length;
  const warnings = lastResult?.warnings ?? [];
  const hasDetails = failures > 0 || warnings.length > 0;
  let message = progress.phase;
  let Icon = Loader2;
  if (isExporting) {
    message = progress.phase;
  } else if (lastResult?.cancelled) {
    message = `Export canceled; ${lastResult.filesWritten.length} completed files were kept.`;
    Icon = AlertCircle;
  } else if (failures > 0) {
    message = `${lastResult?.filesWritten.length ?? 0} files exported, ${failures} failed.`;
    Icon = AlertCircle;
  } else if (warnings.length > 0) {
    message = `Exported ${lastResult?.filesWritten.length ?? 0} files with a warning.`;
    Icon = AlertCircle;
  } else if (lastResult) {
    message = `Exported ${lastResult.exportedFrames} frames (${lastResult.filesWritten.length} files) to ${lastResult.outputPath}`;
    Icon = CheckCircle2;
  } else if (!isExporting && failures > 0) {
    message = `Export failed: ${errors[0].message}`;
    Icon = AlertCircle;
  }

  return (
    <div className="space-y-2 rounded-md border p-3" role={isExporting ? "status" : "alert"}>
      <div className="flex items-start gap-2 text-xs">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isExporting ? "animate-spin text-primary" : failures || warnings.length || lastResult?.cancelled ? "text-amber-500" : "text-emerald-500"}`} />
        <span className="min-w-0 break-all">{message}</span>
      </div>
      {isExporting && (
        <>
          <progress className="h-2 w-full accent-primary" max={100} value={percent} />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{progress.current}/{progress.total}</span>
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={cancelExport}>Cancel</Button>
          </div>
        </>
      )}
      {!isExporting && hasDetails && (
        <div>
          <Button type="button" size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide details" : "View details"}
          </Button>
          {showDetails && <ul className="mt-1 max-h-28 list-disc overflow-auto pl-4 text-[10px] text-muted-foreground">
            {errors.map((error, index) => <li key={`${error.frameId}-${index}`}>{error.frameId ? `${error.frameId}: ` : ""}{error.message}</li>)}
            {warnings.map((warning, index) => <li key={`warning-${index}`}>{warning}</li>)}
          </ul>}
        </div>
      )}
      {!isExporting && <Button type="button" size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={() => setDismissed(true)}>Dismiss</Button>}
      {lastExportPath && !isExporting && <div className="break-all text-[10px] text-muted-foreground">{lastExportPath}</div>}
    </div>
  );
}
