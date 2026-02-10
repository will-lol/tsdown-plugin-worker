// Type declarations for tsdown-plugin-worker
// These declarations allow TypeScript to understand worker imports

/// <reference lib="webworker" />

declare module "*?worker" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

declare module "*?worker&inline" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

declare module "*?sharedworker" {
  const sharedWorkerConstructor: {
    new (options?: { name?: string }): SharedWorker;
  };
  export default sharedWorkerConstructor;
}

declare module "*?sharedworker&inline" {
  const sharedWorkerConstructor: {
    new (options?: { name?: string }): SharedWorker;
  };
  export default sharedWorkerConstructor;
}
