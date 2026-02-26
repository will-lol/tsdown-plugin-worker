/// <reference lib="webworker" />
// Simple worker that echoes messages back
self.onmessage = (event: MessageEvent) => {
  self.postMessage(`Echo: ${event.data}`);
};
