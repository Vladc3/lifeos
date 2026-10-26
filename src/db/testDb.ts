/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Db } from "./types";

const migrationsDir = join(import.meta.dirname, "../../src-tauri/migrations");

// plugin-sql binds positional $1, $2…; node:sqlite only binds those by name.
// Booleans and undefined are mapped the way plugin-sql stores them.
function toNamed(bindValues: unknown[] = []): Record<string, SQLInputValue> {
  return Object.fromEntries(
    bindValues.map((value, i) => [
      `$${i + 1}`,
      typeof value === "boolean"
        ? Number(value)
        : ((value ?? null) as SQLInputValue),
    ]),
  );
}

/** In-memory SQLite with every migration applied in order (plan F1, D1). */
export function createTestDb(): Db {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  return {
    async execute(query, bindValues) {
      const result = sqlite.prepare(query).run(toNamed(bindValues));
      return {
        rowsAffected: Number(result.changes),
        lastInsertId: Number(result.lastInsertRowid),
      };
    },
    async select<T>(query: string, bindValues?: unknown[]) {
      return sqlite.prepare(query).all(toNamed(bindValues)) as T;
    },
  };
}

/** For tests: the value, or a clear failure instead of a non-null assertion. */
export function must<T>(value: T | undefined, what = "value"): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}
