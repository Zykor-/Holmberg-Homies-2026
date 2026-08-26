import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds Holmberg Homies production metadata", async () => {
  const serverBundle = await readFile(
    new URL("../dist/server/index.js", import.meta.url),
    "utf8",
  );

  assert.match(serverBundle, /title:\s*["']Holmberg Homies 2026["']/);
  assert.match(serverBundle, /Holmberg Park in Spokane/);
  assert.doesNotMatch(serverBundle, /codex-preview/);
});
