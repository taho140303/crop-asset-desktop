import { Clock, FileImage, Image as ImageIcon, Sparkles } from "lucide-react";
import { useImageStore } from "@/store/useImageStore";

const SAMPLE_ASSETS = [
  {
    name: "Kawaii Bear Bounce",
    path: "/assets/Kawaii Bear Bounce Sprite Strip.png",
  },
  {
    name: "Eight-Frame Pixel Bear Walk",
    path: "/assets/Eight-Frame Pixel Bear Walk Cycle.png",
  },
  {
    name: "Chibi Bear Wiggling",
    path: "/assets/Chibi Bear Wiggling Sprite Sheet.png",
  },
  {
    name: "Chibi Bear Surprise",
    path: "/assets/Chibi Bear Surprise Sprite Sheet.png",
  },
  {
    name: "Chibi Bear Poof Animation",
    path: "/assets/Chibi Bear Poof Animation Sprite Sheet.png",
  },
  {
    name: "Angry Bear Puff",
    path: "/assets/Angry Bear Puff Sprite Sheet.png",
  },
  {
    name: "Pixel Anger Escalation",
    path: "/assets/Pixel Anger Escalation Sprite Sheet.png",
  },
  {
    name: "Chibi Bear Rage Strip",
    path: "/assets/Chibi Bear Rage Animation Strip.png",
  },
  {
    name: "Sleeping Bear Pixel Strip",
    path: "/assets/Sleeping Bear Pixel Sprite Strip.png",
  },
  {
    name: "Chibi Bear Ninja Smoke-Bomb",
    path: "/assets/Chibi Bear Ninja Smoke-Bomb Sprite Sheet.png",
  },
  {
    name: "Kawaii Hamster Falling",
    path: "/assets/Kawaii Hamster Falling Sprite Sequence.png",
  },
];

export function LeftSidebar() {
  const currentImage = useImageStore((state) => state.currentImage);
  const recentFiles = useImageStore((state) => state.recentFiles);
  const loadImage = useImageStore((state) => state.loadImage);
  const isLoading = useImageStore((state) => state.isLoading);

  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-r bg-card text-card-foreground select-none overflow-hidden"
      aria-label="Files"
    >
      {/* Header */}
      <div className="flex h-10 items-center border-b px-3 text-xs font-semibold text-muted-foreground">
        <Clock className="mr-2 size-3.5" />
        <span>Recent & Samples</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Recent opened files list */}
        {recentFiles.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-medium tracking-wider uppercase text-muted-foreground/70">
              Recent Files
            </div>
            <div className="mt-1 space-y-0.5">
              {recentFiles.map((file) => {
                const isSelected = currentImage?.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => loadImage(file.path)}
                    disabled={isLoading}
                    className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                    title={file.path}
                  >
                    <FileImage
                      className={`size-3.5 shrink-0 ${
                        isSelected
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate leading-tight">{file.name}</div>
                      {file.width && file.height && (
                        <div
                          className={`text-[10px] font-mono leading-tight ${
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {file.width} × {file.height}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset AI sprite sheets from public/assets */}
        <div>
          <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium tracking-wider uppercase text-muted-foreground/70">
            <Sparkles className="size-3 text-amber-500" />
            <span>Sample Sheets</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {SAMPLE_ASSETS.map((sample) => {
              const isSelected = currentImage?.path === sample.path;
              return (
                <button
                  key={sample.path}
                  onClick={() => loadImage(sample.path)}
                  disabled={isLoading}
                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  title={sample.name}
                >
                  <ImageIcon
                    className={`size-3.5 shrink-0 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="truncate leading-tight">{sample.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
