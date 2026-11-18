"use strict";
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

function parseUciInfo(line) {
  if (!line || !line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);
  const info = { raw: line, depth: null, seldepth: null, multipv: 1, score: null, nps: null, nodes: null, time: null, pv: [] };
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (["depth", "seldepth", "multipv", "nps", "nodes", "time"].includes(token) && tokens[i + 1] !== undefined) info[token] = Number(tokens[++i]);
    else if (token === "score" && tokens[i + 2] !== undefined) info.score = { type: tokens[++i], value: Number(tokens[++i]) };
    else if (token === "pv") { info.pv = tokens.slice(i + 1); break; }
  }
  return info;
}

class UciEngine extends EventEmitter {
  constructor({ binaryPath, args = [], spawnImpl = spawn, fairnessLock }) {
    super();
    if (!binaryPath) throw new TypeError("binaryPath is required");
    this.binaryPath = binaryPath; this.args = args; this.spawnImpl = spawnImpl; this.fairnessLock = fairnessLock;
    this.child = null; this.buffer = ""; this.ready = false; this.closed = false;
    this.readyPromise = null; this._readyWaiters = []; this.searching = false;
  }
  start() {
    if (this.child && !this.closed) return this.readyPromise || Promise.resolve();
    this.closed = false; this.ready = false; this.buffer = "";
    this.child = this.spawnImpl(this.binaryPath, this.args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", chunk => this._consume(chunk));
    this.child.stderr.on("data", chunk => this.emit("stderr", String(chunk)));
    this.child.on("error", error => this.emit("engineError", error));
    this.child.on("exit", (code, signal) => {
      this.closed = true; this.ready = false; this.searching = false;
      this.emit("exit", { code, signal });
    });
    this.readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("UCI engine did not answer uciok within 10 seconds")), 10000);
      const onError = error => { clearTimeout(timer); this.removeListener("engineError", onError); reject(error); };
      this._readyWaiters.push(() => { clearTimeout(timer); this.removeListener("engineError", onError); resolve(); });
      this.once("engineError", onError);
    });
    this.readyPromise.catch(() => {});
    this.send("uci");
    return this.readyPromise;
  }
  _consume(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/); this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (line === "uciok") { this.ready = true; this._readyWaiters.splice(0).forEach(resolve => resolve()); this.emit("ready"); }
      else if (line === "readyok") this.emit("readyok");
      else if (line.startsWith("info ")) { const info = parseUciInfo(line); if (info) this.emit("info", info); }
      else if (line.startsWith("bestmove ")) { this.searching = false; this.emit("bestmove", line.split(/\s+/)[1]); }
      this.emit("line", line);
    }
  }
  send(command) {
    if (!this.child || this.closed || !this.child.stdin.writable) throw new Error("UCI engine is not running");
    if (typeof command !== "string" || /[\r\n]/.test(command)) throw new TypeError("Invalid UCI command");
    this.child.stdin.write(command + "\n");
  }
  setOption(name, value) {
    if (!this.ready) throw new Error("UCI engine is not ready");
    if (typeof name !== "string" || !/^[a-zA-Z0-9 _-]{1,64}$/.test(name)) throw new TypeError("Invalid UCI option name");
    if (!["string","number","boolean"].includes(typeof value) || /[\r\n]/.test(String(value))) throw new TypeError("Invalid UCI option value");
    this.send("setoption name " + name + " value " + String(value));
  }
  async _stopSearch() {
    if (!this.searching) return;
    await new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); this.removeListener("bestmove", finish); resolve(); };
      const timer = setTimeout(finish, 1500);
      this.once("bestmove", finish);
      try { this.send("stop"); } catch { finish(); }
    });
  }
  async analyze({ fen, moves, depth = 18, movetime, multipv = 1, context } = {}) {
    if (this.fairnessLock) this.fairnessLock.assertCanAnalyze(context);
    if (!this.ready) throw new Error("UCI engine is not ready");
    if (fen && (typeof fen !== "string" || !/^[prnbqkPRNBQK1-8/]+ [wb] (?:-|[KQkq]+) (?:-|[a-h][36]) \d+ \d+$/.test(fen))) throw new TypeError("Invalid FEN position");
    if (moves && (!Array.isArray(moves) || moves.some(move => !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)))) throw new TypeError("Invalid UCI move list");
    if (!fen && !moves) throw new TypeError("fen or moves is required");
    if (this.fairnessLock) this.fairnessLock.assertCanAnalyze(context);
    await this._stopSearch();
    this.send("ucinewgame");
    const ready = new Promise(resolve => this.once("readyok", resolve));
    this.send("isready");
    await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error("UCI engine readiness timeout")),5000))]);
    if (this.fairnessLock) this.fairnessLock.assertCanAnalyze(context);
    this.send("position " + (fen ? "fen " + fen : "startpos moves " + moves.join(" ")));
    this.send("setoption name MultiPV value " + Math.max(1, Math.min(5, Math.trunc(Number(multipv)||1))));
    this.searching = true;
    const requestedDepth = Math.max(1, Math.min(128, Math.trunc(Number(depth)||18)));
    const requestedTime = Number(movetime);
    this.send(requestedTime > 0 ? "go movetime " + Math.min(3600000, Math.trunc(requestedTime)) : "go depth " + requestedDepth);
  }
  stop() { if (this.child && !this.closed && this.searching) { try { this.send("stop"); } catch {} } }
  quit() {
    if (!this.child || this.closed) return;
    try { this.send("quit"); } catch {}
    const child = this.child; this.child = null; this.closed = true; this.ready = false; this.searching = false;
    if (child.exitCode === null && !child.killed) child.kill();
  }
}
module.exports = { UciEngine, parseUciInfo };
