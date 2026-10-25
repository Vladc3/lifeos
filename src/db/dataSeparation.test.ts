/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// PUB-03: the default config is the dev one, only build:release uses the real identifier.
const root = join(import.meta.dirname, "../..");
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(root, path), "utf8"));

const devConfig = readJson("src-tauri/tauri.conf.json");
const releaseConfig = readJson("src-tauri/tauri.release.conf.json");
const scripts = readJson("package.json").scripts;

it("dev and release use different identifiers, so different data folders", () => {
  expect(devConfig.identifier).toBe("io.github.vladc3.lifeos.dev");
  expect(releaseConfig.identifier).toBe("io.github.vladc3.lifeos");
});

it("dev and release have different product names, so autostart entries never collide", () => {
  expect(devConfig.productName).not.toBe(releaseConfig.productName);
});

it("only build:release applies the release config", () => {
  const usingRelease = Object.entries(scripts).filter(([, command]) =>
    String(command).includes("tauri.release.conf.json"),
  );
  expect(usingRelease.map(([name]) => name)).toEqual(["build:release"]);
});
