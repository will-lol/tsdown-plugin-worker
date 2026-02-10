import path from "node:path";
import MagicString from "magic-string";
import type { Plugin } from "rolldown";
import type { WorkerPluginOptions } from "./types";
import { WorkerOutputCache } from "./cache";
import { bundleWorkerEntry, workerFileToUrl, cleanUrl } from "./bundle";
import { normalizePath } from "./utils";

const workerOrSharedWorkerRE: RegExp = /(?:\?|&)(worker|sharedworker)(?:&|$)/;
const inlineRE = /[?&]inline\b/;
export const workerAssetUrlRE: RegExp = /__WORKER_ASSET__([a-z\d]{8})__/g;

export function workerQueryPlugin(options: WorkerPluginOptions): Plugin {
  const { format } = options;
  const workerOutputCache = new WorkerOutputCache();
  const emittedAssets = new Set<string>();

  return {
    name: "tsdown:worker-query",

    buildStart() {
      emittedAssets.clear();
    },

    load: {
      filter: { id: workerOrSharedWorkerRE },
      async handler(id: string) {
        const workerMatch = workerOrSharedWorkerRE.exec(id);
        if (!workerMatch) return;

        const workerConstructor =
          workerMatch[1] === "sharedworker" ? "SharedWorker" : "Worker";
        const workerType = format === "es" ? "module" : "classic";
        const workerTypeOption = `{
          ${workerType === "module" ? `type: "module",` : ""}
          name: options?.name
        }`;

        let urlCode: string;

        if (inlineRE.test(id)) {
          const result = await bundleWorkerEntry(id, options);

          if (result.watchedFiles) {
            for (const file of result.watchedFiles) {
              this.addWatchFile(file);
            }
          }

          const jsContent = `const jsContent = ${JSON.stringify(result.entryCode)};`;

          const code =
            workerConstructor === "Worker"
              ? `${jsContent}
            const blob = typeof self !== "undefined" && self.Blob && new Blob([${
              workerType === "classic"
                ? `'(self.URL || self.webkitURL).revokeObjectURL(self.location.href);',`
                : `'URL.revokeObjectURL(import.meta.url);',`
            }jsContent], { type: "text/javascript;charset=utf-8" });
            export default function WorkerWrapper(options) {
              let objURL;
              try {
                objURL = blob && (self.URL || self.webkitURL).createObjectURL(blob);
                if (!objURL) throw ''
                const worker = new ${workerConstructor}(objURL, ${workerTypeOption});
                worker.addEventListener("error", () => {
                  (self.URL || self.webkitURL).revokeObjectURL(objURL);
                });
                return worker;
              } catch(e) {
                return new ${workerConstructor}(
                  'data:text/javascript;charset=utf-8,' + encodeURIComponent(jsContent),
                  ${workerTypeOption}
                );
              }
            }`
              : `${jsContent}
            export default function WorkerWrapper(options) {
              return new ${workerConstructor}(
                'data:text/javascript;charset=utf-8,' + encodeURIComponent(jsContent),
                ${workerTypeOption}
              );
            }
            `;

          return {
            code,
            map: { mappings: "" },
          };
        } else {
          const result = await workerFileToUrl(id, options);
          urlCode = JSON.stringify(result.entryUrlPlaceholder);

          // Save the bundle to the cache so renderChunk can look up the filename
          workerOutputCache.saveWorkerBundle(
            cleanUrl(id),
            result.watchedFiles || [],
            result.entryFilename,
            result.entryCode,
            result.assets,
          );

          if (result.watchedFiles) {
            for (const file of result.watchedFiles) {
              this.addWatchFile(file);
            }
          }
        }

        return {
          code: `export default function WorkerWrapper(options) {
            return new ${workerConstructor}(
              ${urlCode},
              ${workerTypeOption}
            );
          }`,
          map: { mappings: "" },
        };
      },
    },

    renderChunk(code, _chunk, outputOptions) {
      let s: MagicString | undefined;

      workerAssetUrlRE.lastIndex = 0;
      if (workerAssetUrlRE.test(code)) {
        let match: RegExpExecArray | null;
        s = new MagicString(code);
        workerAssetUrlRE.lastIndex = 0;

        while ((match = workerAssetUrlRE.exec(code))) {
          const [full, hash] = match;
          if (!hash) continue;

          const filename = workerOutputCache.getEntryFilenameFromHash(hash);
          if (!filename) {
            this.warn(`Could not find worker asset for hash: ${hash}`);
            continue;
          }

          let replacement: string;
          if (outputOptions.dir) {
            const relativePath = path.relative(outputOptions.dir, filename);
            replacement = JSON.stringify(relativePath).slice(1, -1);
          } else if (outputOptions.file) {
            const outputDir = path.dirname(outputOptions.file);
            const relativePath = path.relative(outputDir, filename);
            replacement = JSON.stringify(relativePath).slice(1, -1);
          } else {
            replacement = filename;
          }

          s.update(match.index, match.index + full.length, replacement);
        }
      }

      if (s) {
        return {
          code: s.toString(),
          map: s.generateMap({ hires: "boundary" }),
        };
      }
    },

    generateBundle(_opts, bundle) {
      for (const asset of workerOutputCache.getAssets()) {
        if (emittedAssets.has(asset.fileName)) continue;
        emittedAssets.add(asset.fileName);

        const duplicateAsset = bundle[asset.fileName];
        if (duplicateAsset) {
          const content =
            duplicateAsset.type === "asset"
              ? duplicateAsset.source
              : duplicateAsset.code;
          if (isSameContent(content, asset.source)) {
            continue;
          }
        }

        this.emitFile({
          type: "asset",
          fileName: asset.fileName,
          source: asset.source,
        });
      }
    },

    watchChange(file: string) {
      workerOutputCache.invalidateAffectedBundles(normalizePath(file));
    },
  };
}

function isSameContent(a: string | Uint8Array, b: string | Uint8Array) {
  if (typeof a === "string") {
    if (typeof b === "string") {
      return a === b;
    }
    return Buffer.from(a).equals(Buffer.from(b));
  }
  return Buffer.from(b).equals(Buffer.from(a));
}
