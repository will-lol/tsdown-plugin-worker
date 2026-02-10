import crypto from "node:crypto";

export function getHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

export function normalizePath(id: string): string {
  return id.replace(/\\/g, "/");
}
