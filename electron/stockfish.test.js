const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveStockfishPath } = require("./stockfish");

test("resolves the expected binary for a supported OS and architecture", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chessist-engine-"));
  const binary = path.join(root, "engines", "stockfish-ubuntu-x86-64-avx2");
  fs.mkdirSync(path.dirname(binary));
  fs.writeFileSync(binary, "");
  assert.equal(resolveStockfishPath({ platform: "linux", arch: "x64", appPath: root }), binary);
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects unsupported platform and architecture", () => {
  assert.throws(() => resolveStockfishPath({ platform: "freebsd", arch: "x64" }), /Unsupported/);
});

test("requires a custom path to be absolute and existing", () => {
  assert.throws(() => resolveStockfishPath({ userPath: "stockfish" }), /absolute/);
  assert.throws(() => resolveStockfishPath({ userPath: path.join(os.tmpdir(), "missing-stockfish") }), /not found/);
});
