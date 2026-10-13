import { open } from "@tauri-apps/plugin-dialog";
import { Download, FolderOpen, Image as ImageIcon, Scissors } from "lucide-react";
import { useImageStore } from "@/store/useImageStore";
import { useRef } from "react";

export function TopBar() {
  const currentImage = useImageStore((state) => state.currentImage);
  const isLoading = useImageStore((state) => state.isLoading);
  const loadImage = useImageStore((state) => state.loadImage);
  const loadFile = useImageStore((state) => state.loadFile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenImage = async () => {
    try {
      // 1. Try Tauri native dialog
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await loadImage(selected);
      }
    } catch {
      // Fallback for browser / web dev mode
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
    }
    // Reset file input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4 select-none">
      {/* Hidden file input for web fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Left: App Brand & Current File Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 font-semibold text-foreground shrink-0">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="tracking-tight text-sm font-bold">Sprite Cropper</span>
        </div>

        <div className="h-4 w-px bg-border shrink-0" />

        {currentImage ? (
          <div className="flex items-center gap-2.5 min-w-0 text-xs">
            <span
              className="truncate max-w-[280px] font-medium text-foreground"
              title={currentImage.path}
            >
              {currentImage.name}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shrink-0">
              {currentImage.width} × {currentImage.height} px
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="size-3.5" />
            <span>No image loaded</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenImage}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          title="Open Image (PNG, JPG, WebP)"
        >
          <FolderOpen className="size-3.5" />
          <span>{isLoading ? "Opening..." : "Open Image"}</span>
        </button>

        <button
          disabled={!currentImage}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
          title="Export slices (coming in future sprint)"
        >
          <Download className="size-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
