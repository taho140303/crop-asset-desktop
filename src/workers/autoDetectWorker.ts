import type { AutoDetectConfig } from "../types/autoDetect";
import { detectFramesFromImageData, type DetectResult } from "../lib/autoDetectAlgorithm";

export interface WorkerRequest {
  type: "DETECT";
  id: string;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  config: AutoDetectConfig;
}

export interface WorkerResponse {
  type: "DETECT_RESULT";
  id: string;
  result: DetectResult;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, id, width, height, buffer, config } = e.data;
  if (type === "DETECT") {
    const data = new Uint8ClampedArray(buffer);
    const result = detectFramesFromImageData(data, width, height, config);
    const response: WorkerResponse = {
      type: "DETECT_RESULT",
      id,
      result,
    };
    self.postMessage(response);
  }
};
