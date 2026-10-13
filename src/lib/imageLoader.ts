import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import type { LoadedImage } from "@/types/image";

/**
 * Loads an image given a file path or URL.
 * Supports Tauri desktop file paths (via invoke or plugin-fs) as well as web paths/URLs.
 */
export async function loadImageFromPath(path: string): Promise<LoadedImage> {
  const isWebOrHttp =
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:") ||
    path.startsWith("/assets/") ||
    path.startsWith("assets/");

  let srcUrl: string = path;
  let objectUrlToRevoke: string | undefined = undefined;

  if (!isWebOrHttp) {
    try {
      // 1. Try Tauri convertFileSrc if available (zero-copy / streaming webview asset)
      // Or 2. @tauri-apps/plugin-fs into Blob ObjectURL (high performance, avoids huge string overhead)
      const bytes = await readFile(path);
      const mime = path.toLowerCase().endsWith(".png")
        ? "image/png"
        : path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : path.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/png";

      const blob = new Blob([bytes], { type: mime });
      objectUrlToRevoke = URL.createObjectURL(blob);
      srcUrl = objectUrlToRevoke;
    } catch {
      try {
        // Fallback to Tauri invoke command `read_image_as_base64`
        const base64Data = await invoke<string>("read_image_as_base64", { path });
        srcUrl = base64Data;
      } catch (invokeErr) {
        throw new Error(`Failed to load image from path "${path}": ${String(invokeErr)}`);
      }
    }
  }

  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const fileName = path.split(/[/\\]/).pop() || path;
      resolve({
        path,
        name: fileName,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        bitmap: img,
        objectUrl: objectUrlToRevoke,
      });
    };
    img.onerror = (err) => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error(`Failed to decode image from "${path}": ${String(err)}`));
    };
    img.src = srcUrl;
  });
}

/**
 * Loads an image from a standard browser File object (e.g. from web drag-and-drop or file input).
 */
export async function loadImageFromFile(file: File): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        path: file.name,
        name: file.name,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        bitmap: img,
        objectUrl,
      });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image from file "${file.name}": ${String(err)}`));
    };
    img.src = objectUrl;
  });
}
