// Entry file importing worker with dependencies
import WorkerWithImports from './worker-with-imports.ts?worker';

export function createWorker(): Worker {
  return new WorkerWithImports();
}
