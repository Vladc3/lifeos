import Database from "@tauri-apps/plugin-sql";
import type { Db } from "./types";

let dbPromise: Promise<Db> | undefined;

// Opening the DB runs the migrations registered in src-tauri/src/migrations.rs.
// The path is relative to the app config dir, which depends on the identifier (PUB-03).
// Cached: every Database.load opens a new pool and only the first one migrates,
// so a second load (StrictMode, retries) must never happen. Failures are not retried.
export function openDb(): Promise<Db> {
  dbPromise ??= Database.load("sqlite:life-os.db"); // typed as Promise<Db>: tsc catches drift (D10)
  return dbPromise;
}
