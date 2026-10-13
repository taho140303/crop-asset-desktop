import { create } from "zustand";
import { AutoDetectConfig, DetectedBBox } from "../types/autoDetect";
import { WorkerRequest, WorkerResponse } from "../workers/autoDetectWorker";
import AutoDetectWorkerClass from "../workers/autoDetectWorker?worker";

export interface AutoDetectState {
  config: AutoDetectConfig;
  detectedFrames: DetectedBBox[];
  isDetecting: boolean;
  hasNoAlphaWarning: boolean;
  lastDetectionDuration: number;
  toastMessage: string | null;

  setConfig: (partial: Partial<AutoDetectConfig>) => void;
  runDetection: (image: HTMLImageElement) => Promise<DetectedBBox[]>;
  clearToast: () => void;
  setDetectedFrames: (frames: DetectedBBox[]) => void;
}

let workerInstance: Worker | null = null;
let currentRequestId = 0;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new AutoDetectWorkerClass();
  }
  return workerInstance;
}

export const useAutoDetectStore = create<AutoDetectState>((set, get) => ({
  config: {
    alphaThreshold: 10,
    minGap: 10,
    minFrameSize: 35, // default 35 filters out minor stray dust while keeping full frames
    mergeTouching: true,
  },
  detectedFrames: [],
  isDetecting: false,
  hasNoAlphaWarning: false,
  lastDetectionDuration: 0,
  toastMessage: null,

  setConfig: (partial) => {
    set((state) => ({
      config: { ...state.config, ...partial },
    }));
  },

  clearToast: () => set({ toastMessage: null }),

  setDetectedFrames: (frames) => set({ detectedFrames: frames }),

  runDetection: async (image: HTMLImageElement) => {
    set({ isDetecting: true, hasNoAlphaWarning: false, toastMessage: null });

    const { width, height } = image;
    const config = get().config;

    try {
      // Offscreen canvas to extract ImageData quickly
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Failed to get 2D context");
      }
      ctx.drawImage(image, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);

      // Clone or transfer the buffer to Web Worker
      const buffer = imgData.data.buffer;
      const worker = getWorker();
      const reqId = String(++currentRequestId);

      const result = await new Promise<DetectedBBox[]>((resolve) => {
        const handler = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id === reqId) {
            worker.removeEventListener("message", handler);
            const { bboxes, hasNoAlpha, durationMs } = e.data.result;

            if (hasNoAlpha) {
              set({
                hasNoAlphaWarning: true,
                detectedFrames: [],
                isDetecting: false,
                lastDetectionDuration: durationMs,
                toastMessage: "Ảnh không có alpha, dùng Uniform Grid",
              });
              resolve([]);
              return;
            }

            if (bboxes.length === 0) {
              set({
                hasNoAlphaWarning: false,
                detectedFrames: [],
                isDetecting: false,
                lastDetectionDuration: durationMs,
                toastMessage: "Không phát hiện được frame nào! Hãy thử giảm alpha threshold hoặc min frame size.",
              });
              resolve([]);
              return;
            }

            set({
              hasNoAlphaWarning: false,
              detectedFrames: bboxes,
              isDetecting: false,
              lastDetectionDuration: durationMs,
              toastMessage: null,
            });
            resolve(bboxes);
          }
        };

        worker.addEventListener("message", handler);
        const req: WorkerRequest = {
          type: "DETECT",
          id: reqId,
          width,
          height,
          buffer,
          config,
        };
        // Transfer the array buffer for zero-copy performance!
        worker.postMessage(req, [buffer]);
      });

      return result;
    } catch (err: any) {
      set({
        isDetecting: false,
        toastMessage: "Lỗi trong quá trình detect: " + (err.message || String(err)),
      });
      return [];
    }
  },
}));
