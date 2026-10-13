export interface LoadedImage {
  path: string;
  name: string;
  width: number;
  height: number;
  bitmap: HTMLImageElement;
  objectUrl?: string; // used to revoke when replacing or unloading
}

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface RecentFile {
  path: string;
  name: string;
  width?: number;
  height?: number;
  lastOpened: number;
}
