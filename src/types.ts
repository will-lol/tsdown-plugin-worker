import type { RolldownOptions } from "rolldown";

export interface WorkerPluginOptions {
  format: "es" | "iife";
  rolldownOptions?: RolldownOptions;
}

export type WorkerBundle = {
  entryFilename: string;
  entryCode: string;
  entryUrlPlaceholder: string;
  referencedAssets: Set<string>;
  watchedFiles: string[];
  assets: WorkerBundleAsset[];
};

export type WorkerBundleAsset = {
  fileName: string;
  originalFileName: string | null;
  originalFileNames: string[];
  source: string | Uint8Array;
};
