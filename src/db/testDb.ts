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

export interface TestDb extends Db {
  /** Applies the migrations after the current version, up to `upTo`. */
  migrate(upTo?: number): void;
}

/**
 * In-memory SQLite with migrations applied in order (plan F1, D1). Pass `upTo`
 * to stop at an older version and test an upgrade of a filled DB (plan F4).
 */
export function createTestDb(upTo = Infinity): TestDb {
  const sqlite = new DatabaseSync(":memory:");
  let version = 0;
  const migrate = (to = Infinity) => {
    for (const file of readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const number = Number(file.split("_")[0]);
      if (number <= version || number > to) continue;
      sqlite.exec(readFileSync(join(migrationsDir, file), "utf8"));
      version = number;
    }
  };
  migrate(upTo);
  return {
    migrate,
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
