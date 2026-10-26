import { expect, it, vi } from "vitest";

const { load } = vi.hoisted(() => ({ load: vi.fn(async () => ({})) }));
vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load } }));

import { openDb } from "./index";

it("opens the database only once, even when called twice (StrictMode runs effects twice)", async () => {
  await Promise.all([openDb(), openDb()]);
  expect(load).toHaveBeenCalledTimes(1);
});
