// Entry file using the standard ES modules pattern
const worker = new Worker(new URL('./simple-worker.ts', import.meta.url));

export function getWorker(): Worker {
  return worker;
}
