const path = require("node:path");
const fs = require("node:fs");

const PLATFORM_FILES = {
  win32: { x64: "stockfish-windows-x86-64-avx2.exe", arm64: "stockfish-windows-armv8.exe" },
  darwin: { x64: "stockfish-macos-x86-64", arm64: "stockfish-macos-m1-apple-silicon" },
  linux: { x64: "stockfish-ubuntu-x86-64-avx2", arm64: "stockfish-ubuntu-aarch64" }
};

function resolveStockfishPath({ platform = process.platform, arch = process.arch, appPath = process.cwd(), userPath } = {}) {
  if (userPath) {
    if (!path.isAbsolute(userPath)) throw new Error("Stockfish path must be absolute");
    if (!fs.existsSync(userPath)) throw new Error(`Stockfish binary not found: ${userPath}`);
    return userPath;
  }
  const filename = PLATFORM_FILES[platform]?.[arch];
  if (!filename) throw new Error(`Unsupported Stockfish platform: ${platform}/${arch}`);
  const candidates = [
    path.join(appPath, "engines", filename),
    path.join(process.resourcesPath || appPath, "engines", filename)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error(`Stockfish binary not found. Add ${filename} to the engines folder or choose it in Settings.`);
  return found;
}

module.exports = { resolveStockfishPath, PLATFORM_FILES };
