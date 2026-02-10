import type { Plugin } from "rolldown";
import type { WorkerPluginOptions } from "./types";
import { workerQueryPlugin, workerAssetUrlRE } from "./query-plugin";
import { workerNewUrlPlugin } from "./new-url-plugin";
import { workerPostPlugin } from "./post-plugin";
import { workerFileToUrl } from "./bundle";

/**
 * Factory function that returns all worker plugins as an array.
 * This is the recommended way to use the worker plugin - it handles
 * all worker patterns: query imports (?worker) and new URL() patterns.
 *
 * For IIFE format, also includes the post-processing plugin.
 *
 * @example
 * ```ts
 * import { workerPlugins } from 'tsdown-plugin-worker';
 *
 * export default defineConfig({
 *   plugins: [
 *     workerPlugins({
 *       format: 'es',
 *     }),
 *   ],
 * });
 * ```
 */
export function workerPlugins(options: WorkerPluginOptions): Plugin[] {
  const plugins: Plugin[] = [
    workerQueryPlugin(options),
    workerNewUrlPlugin(options),
  ];

  // Include post plugin for IIFE format
  if (options.format === "iife") {
    plugins.push(workerPostPlugin(options));
  }

  return plugins;
}

// Re-export individual plugins for advanced use cases
export {
  workerQueryPlugin,
  workerNewUrlPlugin,
  workerPostPlugin,
  workerFileToUrl,
  workerAssetUrlRE,
};

// Re-export types
export type { WorkerPluginOptions } from "./types";
export type { WorkerBundle, WorkerBundleAsset } from "./types";

// Default export is the factory function
export default workerPlugins;
