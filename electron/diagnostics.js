const os = require("node:os");
const process = require("node:process");

function getDiagnostics({ enginePath = null, engineReady = false, fairness = { locked: false } } = {}) {
  return {
    appVersion: require("../package.json").version,
    platform: process.platform,
    architecture: process.arch,
    osRelease: os.release(),
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    cpuCount: os.cpus().length,
    enginePath,
    engineReady,
    fairness
  };
}

module.exports = { getDiagnostics };
