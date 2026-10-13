import { Download, FolderOpen, Redo2, Scissors, Undo2 } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <div className="flex items-center gap-2 font-semibold">
        <Scissors className="size-4" />
        <span>Sprite Cropper</span>
      </div>
      <div className="mx-2 h-5 w-px bg-border" />
      <span className="truncate text-sm text-muted-foreground">No file open</span>

      <div className="ml-auto flex items-center gap-1">
        <button className="rounded p-2 text-muted-foreground hover:bg-accent" title="Open">
          <FolderOpen className="size-4" />
        </button>
        <button className="rounded p-2 text-muted-foreground hover:bg-accent" title="Undo">
          <Undo2 className="size-4" />
        </button>
        <button className="rounded p-2 text-muted-foreground hover:bg-accent" title="Redo">
          <Redo2 className="size-4" />
        </button>
        <button className="ml-2 flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Download className="size-4" />
          Export
        </button>
      </div>
    </header>
  );
}
