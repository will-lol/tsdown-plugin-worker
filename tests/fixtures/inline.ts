// Entry file with inline worker
import MyWorker from './simple-worker.ts?worker&inline';

export function createWorker(): Worker {
  return new MyWorker();
}
