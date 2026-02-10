// Entry file that imports a worker
import MyWorker from './simple-worker.ts?worker';

export function createWorker(): Worker {
  return new MyWorker();
}
