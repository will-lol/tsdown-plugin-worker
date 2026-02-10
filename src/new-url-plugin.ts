import path from "node:path";
import MagicString from "magic-string";
import type { Plugin } from "rolldown";
import { stripLiteral } from "strip-literal";
import type { WorkerBundleAsset, WorkerPluginOptions } from "./types";
import { workerFileToUrl, cleanUrl } from "./bundle";
import { WorkerOutputCache } from "./cache";
import { workerAssetUrlRE } from "./query-plugin";

const workerImportMetaUrlRE =
  /new\s+(?:Worker|SharedWorker)\s*\(\s*new\s+URL.+?import\.meta\.url/s;

export function workerNewUrlPlugin(options: WorkerPluginOptions): Plugin {
  const workerOutputCache = new WorkerOutputCache();
  const emittedAssets = new Set<string>();

  return {
    name: "tsdown:worker-new-url",

    buildStart() {
      emittedAssets.clear();
    },

    transform: {
      filter: { code: workerImportMetaUrlRE },
      async handler(code: string, id: string) {
        let s: MagicString | undefined;
        const cleanString = stripLiteral(code);
        const workerImportMetaUrlRE =
          /\bnew\s+(?:Worker|SharedWorker)\s*\(\s*(new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*(?:,\s*)?\))/dg;

        let match: RegExpExecArray | null;
        while ((match = workerImportMetaUrlRE.exec(cleanString))) {
          if (!match.indices) continue;
          const [, endIndex] = match.indices[0] ?? [];
          const [expStart, expEnd] = match.indices[1] ?? [];
          const [urlStart, urlEnd] = match.indices[2] ?? [];
          if (
            endIndex === undefined ||
            expStart === undefined ||
            expEnd === undefined ||
            urlStart === undefined ||
            urlEnd === undefined
          )
            continue;

          const rawUrl = code.slice(urlStart, urlEnd);

          // potential dynamic template string
          if (rawUrl[0] === "`" && rawUrl.includes("${")) {
            this.error(
              "`new URL(url, import.meta.url)` is not supported in dynamic template string.",
              expStart,
            );
          }

          s ||= new MagicString(code);
          const url = rawUrl.slice(1, -1);

          // Skip __WORKER_ASSET__ placeholders (handled by query-plugin)
          if (url.includes("__WORKER_ASSET__")) {
            continue;
          }

          let file: string | undefined;
          if (url[0] === ".") {
            // Relative path
            file = path.resolve(path.dirname(id), url);
            file = slash(file);
          } else if (url[0] === "/") {
            // Absolute path from root
            file = slash(url.slice(1));
          } else {
            // Try to resolve as module
            try {
              const resolved = await this.resolve(url, id);
              if (resolved && typeof resolved === "object" && "id" in resolved) {
                file = resolved.id;
              } else if (typeof resolved === "string") {
                file = resolved;
              }
            } catch {
              file = slash(path.resolve(path.dirname(id), url));
            }
          }

          if (!file) {
            this.error(`Could not resolve worker file: ${url}`, expStart);
            continue;
          }

          // Bundle the worker
          const result = await workerFileToUrl(file, options);
          const builtUrl = result.entryUrlPlaceholder;

          // Save the bundle to the cache so renderChunk can look up the filename
          workerOutputCache.saveWorkerBundle(
            cleanUrl(file),
            result.watchedFiles || [],
            result.entryFilename,
            result.entryCode,
            result.assets
          );

          if (result.watchedFiles) {
            for (const file of result.watchedFiles) {
              this.addWatchFile(file);
            }
          }

          s.update(
            expStart,
            expEnd,
            `new URL(${JSON.stringify(builtUrl)}, import.meta.url)`,
          );
        }

        if (s) {
          return {
            code: s.toString(),
            map: s.generateMap({ hires: "boundary" }),
          };
        }

        return null;
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

          // Worker files are emitted to the same output directory as the main bundle,
          // so we just use the filename directly
          const replacement = filename;

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
      // Emit all bundles (worker entry files)
      for (const bundleData of workerOutputCache.getAllBundles()) {
        const duplicateAsset = bundle[bundleData.entryFilename];
        if (duplicateAsset) {
          const content =
            duplicateAsset.type === "asset"
              ? duplicateAsset.source
              : duplicateAsset.code;
          if (isSameContent(content, bundleData.entryCode)) {
            continue;
          }
        }

        this.emitFile({
          type: "asset",
          fileName: bundleData.entryFilename,
          source: bundleData.entryCode,
        });
      }

      // Emit additional assets (like WASM files)
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

function slash(p: string): string {
  return p.replace(/\\/g, "/");
}
