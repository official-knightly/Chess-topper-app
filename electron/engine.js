const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

function parseUciInfo(line) {
  if (!line || !line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);
  const info = { raw: line, depth: null, seldepth: null, multipv: 1, score: null, nps: null, nodes: null, time: null, pv: [] };
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (["depth", "seldepth", "multipv", "nps", "nodes", "time"].includes(token) && tokens[i + 1] !== undefined) {
      info[token] = Number(tokens[++i]);
    } else if (token === "score" && tokens[i + 2] !== undefined) {
      info.score = { type: tokens[++i], value: Number(tokens[++i]) };
    } else if (token === "pv") {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }
  return info;
}

class UciEngine extends EventEmitter {
  constructor({ binaryPath, args = [], spawnImpl = spawn, fairnessLock }) {
    super();
    if (!binaryPath) throw new TypeError("binaryPath is required");
    this.binaryPath = binaryPath;
    this.args = args;
    this.spawnImpl = spawnImpl;
    this.fairnessLock = fairnessLock;
    this.child = null;
    this.buffer = "";
    this.ready = false;
    this.closed = false;
    this._readyWaiters = [];
  }

  start() {
    if (this.child && !this.closed) return Promise.resolve();
    this.closed = false;
    this.child = this.spawnImpl(this.binaryPath, this.args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", chunk => this._consume(chunk));
    this.child.stderr.on("data", chunk => this.emit("stderr", String(chunk)));
    this.child.on("error", error => this.emit("engineError", error));
    this.child.on("exit", (code, signal) => {
      this.closed = true;
      this.ready = false;
      this.emit("exit", { code, signal });
    });
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Stockfish did not answer uciok")), 10000);
      this._readyWaiters.push(() => { clearTimeout(timer); resolve(); });
      this.once("engineError", error => { clearTimeout(timer); reject(error); });
    });
    this.send("uci");
    return ready;
  }

  _consume(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (line === "uciok") {
        this.ready = true;
        this._readyWaiters.splice(0).forEach(resolve => resolve());
        this.emit("ready");
      } else if (line === "readyok") this.emit("readyok");
      else if (line.startsWith("info ")) {
        const info = parseUciInfo(line);
        if (info) this.emit("info", info);
      } else if (line.startsWith("bestmove ")) this.emit("bestmove", line.split(/\s+/)[1]);
      this.emit("line", line);
    }
  }

  send(command) {
    if (!this.child || this.closed || !this.child.stdin.writable) throw new Error("Stockfish is not running");
    this.child.stdin.write(command + "\n");
  }

  setOption(name, value) {
    if (!this.ready) throw new Error("Stockfish is not ready");
    this.send(`setoption name ${name} value ${value}`);
  }

  async analyze({ fen, moves, depth = 18, movetime, multipv = 1 } = {}) {
    if (this.fairnessLock) this.fairnessLock.assertCanAnalyze();
    if (!this.ready) throw new Error("Stockfish is not ready");
    if (!fen && !moves) throw new TypeError("fen or moves is required");
    this.stop();
    this.send("ucinewgame");
    const ready = new Promise(resolve => this.once("readyok", resolve));
    this.send("isready");
    await ready;
    if (this.fairnessLock) this.fairnessLock.assertCanAnalyze();
    this.send("position " + (fen ? `fen ${fen}` : `startpos moves ${moves.join(" ")}`));
    this.send(`setoption name MultiPV value ${Math.max(1, Math.min(5, multipv))}`);
    this.send(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
  }

  stop() {
    if (this.child && !this.closed) this.send("stop");
  }

  quit() {
    if (!this.child || this.closed) return;
    try { this.send("quit"); } catch {}
    const child = this.child;
    this.child = null;
    this.closed = true;
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

module.exports = { UciEngine, parseUciInfo };
