import type { WorkerBundle, WorkerBundleAsset } from "./types";
import { getHash, normalizePath } from "./utils";
import * as console from "node:console";
import colors from "picocolors";

export class WorkerOutputCache {
  private bundles = new Map<string, WorkerBundle>();
  private assets = new Map<string, WorkerBundleAsset>();
  private fileNameHash = new Map<string, string>();
  private invalidatedBundles = new Set<string>();

  saveWorkerBundle(
    file: string,
    watchedFiles: string[],
    outputEntryFilename: string,
    outputEntryCode: string,
    outputAssets: WorkerBundleAsset[],
  ): WorkerBundle {
    for (const asset of outputAssets) {
      this.saveAsset(asset);
    }
    const bundle: WorkerBundle = {
      entryFilename: outputEntryFilename,
      entryCode: outputEntryCode,
      entryUrlPlaceholder:
        this.generateEntryUrlPlaceholder(outputEntryFilename),
      referencedAssets: new Set(
        outputAssets.map((asset: WorkerBundleAsset) => asset.fileName),
      ),
      watchedFiles,
      assets: outputAssets,
    };
    this.bundles.set(file, bundle);
    return bundle;
  }

  saveAsset(asset: WorkerBundleAsset) {
    const duplicateAsset = this.assets.get(asset.fileName);
    if (duplicateAsset) {
      if (!this.isSameContent(duplicateAsset.source, asset.source)) {
        console.warn(
          colors.yellow(
            `The emitted file ${JSON.stringify(asset.fileName)} overwrites a previously emitted file of the same name.`,
          ),
        );
      }
    }
    this.assets.set(asset.fileName, asset);
  }

  invalidateAffectedBundles(file: string) {
    for (const [bundleInputFile, bundle] of this.bundles.entries()) {
      if (bundle.watchedFiles.includes(file)) {
        this.invalidatedBundles.add(bundleInputFile);
      }
    }
  }

  removeBundleIfInvalidated(file: string) {
    if (this.invalidatedBundles.has(file)) {
      this.invalidatedBundles.delete(file);
      this.removeBundle(file);
    }
  }

  private removeBundle(file: string) {
    const bundle = this.bundles.get(file);
    if (!bundle) return;

    this.bundles.delete(file);
    this.fileNameHash.delete(getHash(bundle.entryFilename));
    this.assets.delete(bundle.entryFilename);

    const keptBundles = [...this.bundles.values()];
    for (const asset of bundle.referencedAssets) {
      if (
        keptBundles.every((b: WorkerBundle) => !b.referencedAssets.has(asset))
      ) {
        this.assets.delete(asset);
      }
    }
  }

  getWorkerBundle(file: string) {
    return this.bundles.get(file);
  }

  getAssets() {
    return this.assets.values();
  }

  getAllBundles() {
    return this.bundles.values();
  }

  getEntryFilenameFromHash(hash: string) {
    return this.fileNameHash.get(hash);
  }

  private generateEntryUrlPlaceholder(entryFilename: string): string {
    const hash = getHash(entryFilename);
    if (!this.fileNameHash.has(hash)) {
      this.fileNameHash.set(hash, entryFilename);
    }
    return `__WORKER_ASSET__${hash}__`;
  }

  private isSameContent(a: string | Uint8Array, b: string | Uint8Array) {
    if (typeof a === "string") {
      if (typeof b === "string") {
        return a === b;
      }
      return Buffer.from(a).equals(Buffer.from(b));
    }
    return Buffer.from(b).equals(Buffer.from(a));
  }
}
