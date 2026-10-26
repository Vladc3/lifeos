/// <reference types="node" />
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// An applied migration must never change: sqlx refuses to start the app on a
// checksum mismatch. New migration = new file + new line in lock.json.
const dir = join(import.meta.dirname, "../../src-tauri/migrations");
const lock: Record<string, string> = JSON.parse(
  readFileSync(join(dir, "lock.json"), "utf8"),
);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(join(dir, file)))
    .digest("hex");

describe("migration lock (plan F1, D2b)", () => {
  it.each(files)("%s is locked and unchanged", (file) => {
    expect(lock[file], `add "${file}": "${sha256(file)}" to lock.json`).toBe(
      sha256(file),
    );
  });

  it("every locked migration still exists", () => {
    expect(Object.keys(lock).filter((f) => !files.includes(f))).toEqual([]);
  });
});
