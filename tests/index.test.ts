import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { rolldownBuild } from "@sxzz/test-utils";
import {
  workerPlugins,
  workerQueryPlugin,
  workerNewUrlPlugin,
  workerPostPlugin,
  workerFileToUrl,
} from "../src/index";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(dirname, "fixtures");

describe("workerPlugins (factory)", () => {
  test("basic worker import with factory", async () => {
    const build = await rolldownBuild(
      path.resolve(fixturesDir, "basic.ts"),
      workerPlugins({ format: "es" }),
    );
    const snapshot = build.snapshot;

    // Check that the output contains WorkerWrapper
    expect(snapshot).toContain("WorkerWrapper");
    expect(snapshot).toContain("Worker");

    // Check that the worker file is properly referenced (not a placeholder)
    expect(snapshot).toContain("simple-worker.js");

    // Check that worker file is emitted as an asset
    const workerAsset = build.chunks.find(
      (chunk: any) => chunk.type === "asset" && chunk.fileName === "simple-worker.js"
    ) as { type: "asset"; source: string } | undefined;
    expect(workerAsset).toBeDefined();
    expect(workerAsset?.source).toContain("self.onmessage");

    // Check that the main chunk references the worker file correctly
    const mainChunk = build.chunks.find(
      (chunk: any) => chunk.type === "chunk" && chunk.fileName === "basic.js"
    ) as { type: "chunk"; code: string } | undefined;
    expect(mainChunk?.code).toContain('new Worker("simple-worker.js"');
  });

  test("iife format includes post plugin", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "basic.ts"),
      workerPlugins({ format: "iife" }),
    );

    // IIFE workers should use classic type
    expect(snapshot).toContain("WorkerWrapper");
  });
});

describe("workerQueryPlugin", () => {
  test("basic worker import", async () => {
    const build = await rolldownBuild(
      path.resolve(fixturesDir, "basic.ts"),
      [workerQueryPlugin({ format: "es" })],
    );
    const { snapshot } = build;

    // Check that the output contains WorkerWrapper
    expect(snapshot).toContain("WorkerWrapper");
    expect(snapshot).toContain("Worker");

    // Check that the worker file is properly referenced (not a placeholder)
    expect(snapshot).toContain("simple-worker.js");

    // Check that worker file is emitted as an asset
    const workerAsset = build.chunks.find(
      (chunk: any) => chunk.type === "asset" && chunk.fileName === "simple-worker.js"
    ) as { type: "asset"; source: string } | undefined;
    expect(workerAsset).toBeDefined();
    expect(workerAsset?.source).toContain("self.onmessage");

    // Check that the main chunk references the worker file correctly
    const mainChunk = build.chunks.find(
      (chunk: any) => chunk.type === "chunk" && chunk.fileName === "basic.js"
    ) as { type: "chunk"; code: string } | undefined;
    expect(mainChunk?.code).toContain('new Worker("simple-worker.js"');
  });

  test("inline worker", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "inline.ts"),
      [workerQueryPlugin({ format: "es" })],
    );

    // Inline workers should contain the bundled code
    expect(snapshot).toContain("jsContent");
    expect(snapshot).toContain("WorkerWrapper");
    expect(snapshot).toContain("Blob");
  });

  test("shared worker", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "shared.ts"),
      [workerQueryPlugin({ format: "es" })],
    );

    // Check for SharedWorker usage
    expect(snapshot).toContain("SharedWorker");
    expect(snapshot).toContain("WorkerWrapper");
  });

  test("worker with imports", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "with-imports.ts"),
      [workerQueryPlugin({ format: "es" })],
    );

    // Should bundle worker with its dependencies
    expect(snapshot).toContain("WorkerWrapper");
    expect(snapshot).toContain("worker-with-imports.js");
  });
});

describe("workerNewUrlPlugin", () => {
  test("handles new URL() pattern with Worker", async () => {
    const build = await rolldownBuild(
      path.resolve(fixturesDir, "new-url-pattern.ts"),
      [workerNewUrlPlugin({ format: "es" })],
    );
    const { snapshot } = build;

    // Should transform the new URL pattern
    expect(snapshot).toContain("Worker");
    // Should replace placeholder with actual worker filename
    expect(snapshot).toContain("simple-worker.js");

    // Check that worker file is emitted as an asset
    const workerAsset = build.chunks.find(
      (chunk: any) => chunk.type === "asset" && chunk.fileName === "simple-worker.js"
    ) as { type: "asset"; source: string } | undefined;
    expect(workerAsset).toBeDefined();
    expect(workerAsset?.source).toContain("self.onmessage");

    // Check that the main chunk references the worker file correctly via import.meta.url
    const mainChunk = build.chunks.find(
      (chunk: any) => chunk.type === "chunk" && chunk.fileName === "new-url-pattern.js"
    ) as { type: "chunk"; code: string } | undefined;
    expect(mainChunk?.code).toContain("simple-worker.js");
    expect(mainChunk?.code).toContain("import.meta.url");
  });

  test("handles new URL() pattern with SharedWorker", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "new-url-shared.ts"),
      [workerNewUrlPlugin({ format: "es" })],
    );

    // Should transform the new URL pattern
    expect(snapshot).toContain("SharedWorker");
    // Should replace placeholder with actual worker filename
    expect(snapshot).toContain("simple-worker.js");
  });

  test("handles new URL() pattern with worker options", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "new-url-with-options.ts"),
      [workerNewUrlPlugin({ format: "es" })],
    );

    // Should transform the new URL pattern
    expect(snapshot).toContain("Worker");
    // Should replace placeholder with actual worker filename
    expect(snapshot).toContain("simple-worker.js");
  });

  test("plugin structure is correct", () => {
    const plugin = workerNewUrlPlugin({ format: "es" });
    expect(plugin.name).toBe("tsdown:worker-new-url");
    expect(plugin.transform).toBeDefined();
    // Should have filter for performance
    expect(plugin.transform).toHaveProperty("filter");
  });
});

describe("workerPostPlugin", () => {
  test("iife format with post plugin", async () => {
    const { snapshot } = await rolldownBuild(
      path.resolve(fixturesDir, "basic.ts"),
      [
        workerQueryPlugin({ format: "iife" }),
        workerPostPlugin({ format: "iife" }),
      ],
    );

    // IIFE workers should use classic type
    expect(snapshot).toContain("WorkerWrapper");
  });
});

describe("workerFileToUrl", () => {
  test("should bundle worker and return bundle info", async () => {
    const bundle = await workerFileToUrl(
      path.resolve(fixturesDir, "simple-worker.ts?worker"),
      { format: "es" },
    );

    expect(bundle.entryFilename).toBeDefined();
    expect(bundle.entryCode).toBeDefined();
    expect(bundle.entryUrlPlaceholder).toContain("__WORKER_ASSET__");
    expect(bundle.watchedFiles).toBeDefined();
    expect(bundle.referencedAssets).toBeInstanceOf(Set);
  });
});

describe("workerAssetUrlRE", () => {
  test("should match worker asset placeholders", async () => {
    const { workerAssetUrlRE } = await import("../src/index");

    const testCases = [
      "__WORKER_ASSET__12345678__",
      "__WORKER_ASSET__abcdef12__",
      "path/to/__WORKER_ASSET__87654321__/file.js",
    ];

    for (const testCase of testCases) {
      workerAssetUrlRE.lastIndex = 0;
      expect(workerAssetUrlRE.test(testCase)).toBe(true);
    }
  });

  test("should not match non-placeholder strings", async () => {
    const { workerAssetUrlRE } = await import("../src/index");

    const testCases = [
      "__WORKER_ASSET__1234567__", // Too short
      "__WORKER_ASSET__123456789__", // Too long
      "__OTHER_ASSET__12345678__", // Wrong prefix
      "random string",
    ];

    for (const testCase of testCases) {
      workerAssetUrlRE.lastIndex = 0;
      expect(workerAssetUrlRE.test(testCase)).toBe(false);
    }
  });
});
