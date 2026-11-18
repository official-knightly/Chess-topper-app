import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const platform = process.argv[2];
if (!["android", "ios"].includes(platform)) throw new Error("Expected android or ios");
if (!existsSync(platform)) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["cap", "add", platform], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
