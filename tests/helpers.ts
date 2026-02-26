import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { rolldownBuild } from "@sxzz/test-utils";
import type { Plugin } from "rolldown";

type BuildResult = Awaited<ReturnType<typeof rolldownBuild>>;
type BuildOutput = BuildResult["chunks"][number];
type BuildChunk = Extract<BuildOutput, { type: "chunk" }>;
type BuildAsset = Extract<BuildOutput, { type: "asset" }>;

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(dirname, "fixtures");

export function fixturePath(fixture: string): string {
  if (fixture.endsWith(".ts")) {
    return path.resolve(fixturesDir, fixture);
  }
  return path.resolve(fixturesDir, fixture, "input.ts");
}

export function snapshotPath(fixture: string, name: string): string {
  return path.resolve(fixturesDir, fixture, `${name}.output.ts`);
}

export async function buildFixture(
  fixture: string,
  plugins: Plugin | Plugin[],
): Promise<BuildResult> {
  return rolldownBuild(fixturePath(fixture), plugins);
}

export function getChunk(build: BuildResult, fileName: string) {
  const chunk = build.chunks.find(
    (item): item is BuildChunk =>
      item.type === "chunk" && item.fileName === fileName,
  );
  const available = build.chunks
    .filter((item) => item.type === "chunk")
    .map((item) => item.fileName)
    .join(", ");

  assertDefined(
    chunk,
    `Expected chunk "${fileName}" to exist. Available chunks: ${available || "(none)"}`,
  );

  return chunk;
}

export function getAsset(build: BuildResult, fileName: string) {
  const asset = build.chunks.find(
    (item): item is BuildAsset =>
      item.type === "asset" && item.fileName === fileName,
  );
  const available = build.chunks
    .filter((item) => item.type === "asset")
    .map((item) => item.fileName)
    .join(", ");

  assertDefined(
    asset,
    `Expected asset "${fileName}" to exist. Available assets: ${available || "(none)"}`,
  );

  return asset;
}

export function expectWorkerAssetEmitted(
  build: BuildResult,
  fileName = "simple-worker.js",
): void {
  const asset = getAsset(build, fileName);
  expect(assetSourceText(asset.source)).toContain("self.onmessage");
}

type WorkerUrlSemanticsOptions = {
  constructorName?: "Worker" | "SharedWorker";
  fileName: string;
  expectImportMetaUrl?: boolean;
};

export function expectWorkerUrlSemantics(
  code: string,
  options: WorkerUrlSemanticsOptions,
): void {
  const {
    constructorName = "Worker",
    fileName,
    expectImportMetaUrl = true,
  } = options;

  expect(code).toContain(`new ${constructorName}`);
  expect(code).toContain(fileName);

  if (expectImportMetaUrl) {
    expect(code).toContain("import.meta.url");
  }
}

export function stripNoise(code: string): string {
  return code.replace(/\r\n/g, "\n").trim();
}

export function assetSourceText(source: string | Uint8Array): string {
  return typeof source === "string" ? source : Buffer.from(source).toString();
}

function assertDefined<T>(
  value: T | undefined,
  message: string,
): asserts value is T {
  expect(value, message).toBeDefined();
}
