// Entry file with shared worker
import MySharedWorker from "../_shared/simple-worker.ts?sharedworker";

export function createSharedWorker(): SharedWorker {
  return new MySharedWorker();
}
