/// <reference lib="webworker" />
// Worker with imports
import type { WorkerMessage } from "./worker-utils";
import { processMessage } from "./worker-utils";

self.onmessage = (event) => {
  const msg = event.data as WorkerMessage;
  const result = processMessage(msg);
  self.postMessage(result);
};
