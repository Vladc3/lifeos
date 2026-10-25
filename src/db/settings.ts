import type { Db } from "./types";

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(
  db: Db,
  key: string,
  value: string,
): Promise<void> {
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
