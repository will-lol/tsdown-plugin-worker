import path from "node:path";
import type { RollupError } from "rolldown";
import type {
  WorkerBundle,
  WorkerBundleAsset,
  WorkerPluginOptions,
} from "./types";
import { normalizePath } from "./utils";

export function cleanUrl(url: string): string {
  return url.replace(/[?#].*$/, "");
}

export async function bundleWorkerEntry(
  id: string,
  options: WorkerPluginOptions,
): Promise<WorkerBundle> {
  const input = cleanUrl(id);
  const { format, rolldownOptions } = options;
  const { rolldown } = await import("rolldown");

  // Merge rolldownOptions with our defaults
  const bundle = await rolldown({
    input,
    preserveEntrySignatures: false,
    ...rolldownOptions,
  });

  let result: Awaited<ReturnType<typeof bundle.generate>>;
  let watchedFiles: string[] | undefined;

  try {
    result = await bundle.generate({
      format,
      // Allow rolldownOptions.output to override format
      ...rolldownOptions?.output,
    });

    if (bundle.watchFiles) {
      const files = await bundle.watchFiles;
      watchedFiles = files.map((f: string) => normalizePath(f));
    }
  } catch (e) {
    if (
      e instanceof Error &&
      e.name === "RollupError" &&
      (e as RollupError).code === "INVALID_OPTION" &&
      e.message.includes('"output.format"')
    ) {
      e.message = e.message.replace("output.format", "worker.format");
    }
    throw e;
  } finally {
    await bundle.close();
  }

  const [outputChunk, ...outputChunks] = result.output;

  const assets: WorkerBundleAsset[] = outputChunks.map((outputChunk) =>
    outputChunk.type === "asset"
      ? {
          fileName: outputChunk.fileName,
          originalFileName: outputChunk.originalFileName ?? null,
          originalFileNames: outputChunk.originalFileNames,
          source: outputChunk.source,
        }
      : {
          fileName: outputChunk.fileName,
          originalFileName: null,
          originalFileNames: [],
          source: outputChunk.code,
        },
  );

  const hash = await getHash(outputChunk.fileName);

  return {
    entryFilename: outputChunk.fileName,
    entryCode: outputChunk.code,
    entryUrlPlaceholder: `__WORKER_ASSET__${hash}__`,
    referencedAssets: new Set(
      assets.map((asset: WorkerBundleAsset) => asset.fileName),
    ),
    watchedFiles: watchedFiles || [],
    assets,
  };
}

export async function workerFileToUrl(
  id: string,
  options: WorkerPluginOptions,
): Promise<WorkerBundle> {
  const bundle = await bundleWorkerEntry(id, options);
  return bundle;
}

async function getHash(text: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}
