// Type declarations for tsdown-plugin-worker
// These declarations allow TypeScript to understand worker imports

// To use these types, add one of the following to your project:
//
// Option 1: In your entry TypeScript file (e.g., src/index.ts)
// /// <reference types="tsdown-plugin-worker/types" />
//
// Option 2: In your tsconfig.json
// {
//   "compilerOptions": {
//     "types": ["tsdown-plugin-worker/types"]
//   }
// }

// Fallback Worker interface for when DOM lib is not included
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Worker {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SharedWorker {}
}

// Worker constructor imports (?worker)
declare module "*?worker" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

// Inline worker imports (?worker&inline)
declare module "*?worker&inline" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

// Worker URL imports (?worker&url)
declare module "*?worker&url" {
  const src: string;
  export default src;
}

// SharedWorker constructor imports (?sharedworker)
declare module "*?sharedworker" {
  const sharedWorkerConstructor: {
    new (options?: { name?: string }): SharedWorker;
  };
  export default sharedWorkerConstructor;
}

// Inline SharedWorker imports (?sharedworker&inline)
declare module "*?sharedworker&inline" {
  const sharedWorkerConstructor: {
    new (options?: { name?: string }): SharedWorker;
  };
  export default sharedWorkerConstructor;
}

// SharedWorker URL imports (?sharedworker&url)
declare module "*?sharedworker&url" {
  const src: string;
  export default src;
}
