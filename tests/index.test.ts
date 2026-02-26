import { describe, expect, test } from "vitest";
import {
  workerPlugins,
  workerQueryPlugin,
  workerNewUrlPlugin,
  workerPostPlugin,
  workerFileToUrl,
  workerAssetUrlRE,
} from "../src/index";
import {
  assetSourceText,
  buildFixture,
  expectWorkerAssetEmitted,
  expectWorkerUrlSemantics,
  fixturePath,
  getAsset,
  getChunk,
  snapshotPath,
  stripNoise,
} from "./helpers";

describe("workerPlugins (factory)", () => {
  test("basic worker import with factory", async () => {
    const build = await buildFixture("basic", workerPlugins({ format: "es" }));

    expect(build.snapshot).toContain("WorkerWrapper");
    expectWorkerAssetEmitted(build);

    const mainChunk = getChunk(build, "input.js");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "Worker",
      fileName: "simple-worker.js",
    });
  });

  test("iife format includes post plugin", async () => {
    const build = await buildFixture(
      "basic",
      workerPlugins({ format: "iife" }),
    );

    expect(build.snapshot).toContain("WorkerWrapper");
    expect(build.snapshot).toContain("self.location.href");
  });
});

describe("workerQueryPlugin", () => {
  test("basic worker import", async () => {
    const build = await buildFixture("basic", [
      workerQueryPlugin({ format: "es" }),
    ]);

    expectWorkerAssetEmitted(build);

    const mainChunk = getChunk(build, "input.js");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "Worker",
      fileName: "simple-worker.js",
    });
    await expect(stripNoise(mainChunk.code)).toMatchFileSnapshot(
      snapshotPath("basic", "worker-query"),
    );
  });

  test("inline worker", async () => {
    const build = await buildFixture("inline", [
      workerQueryPlugin({ format: "es" }),
    ]);

    const mainChunk = getChunk(build, "input.js");
    expect(mainChunk.code).toContain("jsContent");
    expect(mainChunk.code).toContain("WorkerWrapper");
    expect(mainChunk.code).toContain("Blob");
    await expect(stripNoise(mainChunk.code)).toMatchFileSnapshot(
      snapshotPath("inline", "worker-query"),
    );
  });

  test("shared worker", async () => {
    const build = await buildFixture("shared", [
      workerQueryPlugin({ format: "es" }),
    ]);

    const mainChunk = getChunk(build, "input.js");
    expect(mainChunk.code).toContain("WorkerWrapper");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "SharedWorker",
      fileName: "simple-worker.js",
    });
    expectWorkerAssetEmitted(build);
  });

  test("worker with imports", async () => {
    const build = await buildFixture("with-imports", [
      workerQueryPlugin({ format: "es" }),
    ]);

    const mainChunk = getChunk(build, "input.js");
    expect(mainChunk.code).toContain("WorkerWrapper");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "Worker",
      fileName: "worker-with-imports.js",
    });

    const workerAsset = getAsset(build, "worker-with-imports.js");
    expect(workerAsset).toBeDefined();
  });

});

describe("workerNewUrlPlugin", () => {
  test("handles new URL() pattern with Worker", async () => {
    const build = await buildFixture("new-url-pattern", [
      workerNewUrlPlugin({ format: "es" }),
    ]);

    expectWorkerAssetEmitted(build);

    const mainChunk = getChunk(build, "input.js");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "Worker",
      fileName: "simple-worker.js",
    });
    await expect(stripNoise(mainChunk.code)).toMatchFileSnapshot(
      snapshotPath("new-url-pattern", "new-url"),
    );
  });

  test("handles new URL() pattern with SharedWorker", async () => {
    const build = await buildFixture("new-url-shared", [
      workerNewUrlPlugin({ format: "es" }),
    ]);

    const mainChunk = getChunk(build, "input.js");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "SharedWorker",
      fileName: "simple-worker.js",
    });
    expectWorkerAssetEmitted(build);
  });

  test("handles new URL() pattern with worker options", async () => {
    const build = await buildFixture("new-url-with-options", [
      workerNewUrlPlugin({ format: "es" }),
    ]);

    const mainChunk = getChunk(build, "input.js");
    expectWorkerUrlSemantics(mainChunk.code, {
      constructorName: "Worker",
      fileName: "simple-worker.js",
    });
    expect(mainChunk.code).toContain('type: "module"');
    expectWorkerAssetEmitted(build);
  });

  test("plugin structure is correct", () => {
    const plugin = workerNewUrlPlugin({ format: "es" });

    expect(plugin.name).toBe("tsdown:worker-new-url");
    expect(plugin.transform).toBeDefined();
    expect(plugin.transform).toHaveProperty("filter");
  });
});

describe("workerPostPlugin", () => {
  test("iife format with post plugin", async () => {
    const build = await buildFixture("basic", [
      workerQueryPlugin({ format: "iife" }),
      workerPostPlugin({ format: "iife" }),
    ]);

    expect(build.snapshot).toContain("WorkerWrapper");
    expect(build.snapshot).toContain("self.location.href");
  });
});

describe("workerFileToUrl", () => {
  test("should bundle worker and return bundle info", async () => {
    const bundle = await workerFileToUrl(
      `${fixturePath("_shared/simple-worker.ts")}?worker`,
      {
        format: "es",
      },
    );

    expect(bundle.entryFilename).toBeDefined();
    expect(bundle.entryCode).toBeDefined();
    expect(bundle.entryUrlPlaceholder).toContain("__WORKER_ASSET__");
    expect(bundle.watchedFiles).toBeDefined();
    expect(bundle.referencedAssets).toBeInstanceOf(Set);
  });
});

describe("workerAssetUrlRE", () => {
  test("should match worker asset placeholders", () => {
    const testCases = [
      "__WORKER_ASSET__12345678__",
      "__WORKER_ASSET__abcdef12__",
      "path/to/__WORKER_ASSET__87654321__/file.js",
    ];

    for (const testCase of testCases) {
      const regex = new RegExp(workerAssetUrlRE.source, workerAssetUrlRE.flags);
      expect(regex.test(testCase)).toBe(true);
    }
  });

  test("should not match non-placeholder strings", () => {
    const testCases = [
      "__WORKER_ASSET__1234567__",
      "__WORKER_ASSET__123456789__",
      "__OTHER_ASSET__12345678__",
      "random string",
    ];

    for (const testCase of testCases) {
      const regex = new RegExp(workerAssetUrlRE.source, workerAssetUrlRE.flags);
      expect(regex.test(testCase)).toBe(false);
    }
  });
});
