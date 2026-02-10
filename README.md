# tsdown-plugin-worker

A tsdown plugin for handling Web Workers and SharedWorkers. Supports both `?worker` query imports and the standard ES modules `new URL()` pattern.

## Installation

```bash
npm install tsdown-plugin-worker
# or
yarn add tsdown-plugin-worker
# or
bun add tsdown-plugin-worker
```

## Quick Start

```ts
import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

export default defineConfig({
  plugins: [workerPlugins({ format: "es" })],
});
```

## Usage Patterns

### 1. Query Import Pattern (`?worker`)

Import a worker file using the `?worker` query suffix:

```ts
import MyWorker from "./worker.ts?worker";

const worker = new MyWorker();
worker.postMessage("Hello");
```

### 2. SharedWorker Query Import (`?sharedworker`)

For SharedWorkers, use the `?sharedworker` query:

```ts
import MySharedWorker from "./worker.ts?sharedworker";

const sharedWorker = new MySharedWorker();
sharedWorker.port.postMessage("Hello");
```

### 3. Inline Workers (`?worker&inline`)

Bundle worker code inline as a Blob (no separate file):

```ts
import InlineWorker from "./worker.ts?worker&inline";

const worker = new InlineWorker();
worker.postMessage("Hello");
```

### 4. Standard ES Modules `new URL()` Pattern

Use the standard browser pattern with automatic bundling:

```ts
const worker = new Worker(new URL("./worker.ts", import.meta.url));
```

### 5. SharedWorker with `new URL()`

```ts
const sharedWorker = new SharedWorker(new URL("./worker.ts", import.meta.url));
```

### 6. Workers with Options

Pass worker options when using `new URL()`:

```ts
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
```

### 7. Workers with Imports

Workers can import other modules - they'll be bundled automatically:

```ts
// worker.ts
import { processData } from "./utils";

self.onmessage = (event) => {
  const result = processData(event.data);
  self.postMessage(result);
};
```

```ts
// main.ts
import MyWorker from "./worker.ts?worker";

const worker = new MyWorker();
```

## Format Options

### ES Modules (`format: 'es'`)

Default format. Workers are loaded as ES modules:

```ts
workerPlugins({ format: "es" });
```

### IIFE Format (`format: 'iife'`)

For IIFE output with classic script workers:

```ts
workerPlugins({ format: "iife" });
```

## Advanced: Individual Plugins

For fine-grained control, use individual plugins:

```ts
import {
  workerQueryPlugin, // Handles ?worker and ?sharedworker imports
  workerNewUrlPlugin, // Handles new URL() patterns
  workerPostPlugin, // Post-processing for IIFE format
} from "tsdown-plugin-worker";

export default defineConfig({
  plugins: [
    workerQueryPlugin({ format: "iife" }),
    workerNewUrlPlugin({ format: "iife" }),
    workerPostPlugin({ format: "iife" }),
  ],
});
```

## Configuration Options

```ts
interface WorkerPluginOptions {
  format: "es" | "iife"; // Output format
  rolldownOptions?: RolldownOptions; // Custom rolldown options for worker bundling
}
```

## TypeScript Support

Add the following to your `tsconfig.json` for proper worker types:

```json
{
  "compilerOptions": {
    "lib": ["WebWorker"]
  }
}
```

Or use the triple-slash directive in worker files:

```ts
/// <reference lib="webworker" />
```

## License

MIT
