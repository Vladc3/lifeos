import type { QueryResult } from "@tauri-apps/plugin-sql";

// Same shape as Database from @tauri-apps/plugin-sql, so repositories run on the
// real DB in the app and on node:sqlite in tests (plan F1, D10).
export interface Db {
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}
