// Entry file using SharedWorker with new URL pattern
const sharedWorker = new SharedWorker(new URL('./simple-worker.ts', import.meta.url));

export function getSharedWorker(): SharedWorker {
  return sharedWorker;
}
