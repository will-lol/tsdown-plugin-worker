// Entry file with worker options (module type)
const worker = new Worker(
  new URL("../_shared/simple-worker.ts", import.meta.url),
  { type: 'module' }
);

export function getWorker(): Worker {
  return worker;
}
