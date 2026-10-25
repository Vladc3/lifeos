import Database from "@tauri-apps/plugin-sql";
import type { Db } from "./types";

// Opening the DB runs the migrations registered in src-tauri/src/migrations.rs.
// The path is relative to the app config dir, which depends on the identifier (PUB-03).
export async function openDb(): Promise<Db> {
  const db: Db = await Database.load("sqlite:life-os.db"); // typed as Db: tsc catches drift (D10)
  return db;
}
