export const WASM_URL =
  "https://media.githubusercontent.com/media/official-knightly/Berserk-web/main/engine/berserk_bg.wasm";

export type Candidate = {
  rank: number;
  depth: number;
  uci: string;
  pv: string[];
  scoreCp: number;
  mate: number | null;
};

export type SearchResult = {
  bestmove: string;
  scoreCp: number;
  depth: number;
  nodes: string;
  candidates: Candidate[];
};

export type EngineStatus = "idle" | "loading" | "ready" | "error";
type Listener = (s: { status: EngineStatus; progress: number; error?: string }) => void;

declare global {
  interface Window {
    chessist?: { engine?: { authorize?: (context: string) => Promise<unknown> } };
  }
}

class BerserkEngine {
  private worker: Worker | null = null;
  private pending = new Map<number, { resolve: (r: SearchResult) => void; reject: (e: Error) => void }>();
  private seq = 0;
  private queue: Promise<unknown> = Promise.resolve();
  status: EngineStatus = "idle";
  progress = 0;
  error?: string;
  private listeners = new Set<Listener>();
  ready!: Promise<void>;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn({ status: this.status, progress: this.progress, error: this.error });
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach(listener => listener({ status: this.status, progress: this.progress, error: this.error }));
  }

  private async authorize(context: string) {
    const authorize = window.chessist?.engine?.authorize;
    if (!authorize) throw new Error("Berserk analysis requires the desktop fairness authorization service.");
    await authorize(context);
  }

  start() {
    if (this.worker) return this.ready;
    this.status = "loading";
    this.error = undefined;
    this.emit();

    this.ready = new Promise<void>((resolve, reject) => {
      const workerUrl = import.meta.env.DEV
        ? "/engine/engine-worker.js"
        : new URL("../engine/engine-worker.js", import.meta.url).toString();
      const worker = new Worker(workerUrl, { type: "module", name: "Berserk-WASM" });
      this.worker = worker;

      worker.onmessage = event => {
        const message = event.data || {};
        if (message.type === "ready") {
          this.status = "ready";
          this.progress = 1;
          this.emit();
          resolve();
        } else if (message.type === "progress") {
          this.progress = message.total
            ? message.loaded / message.total
            : Math.min(0.95, message.loaded / 64_000_000);
          this.emit();
        } else if (message.type === "init-error") {
          const error = new Error(message.error || "Berserk WASM initialization failed.");
          this.fail(error);
          reject(error);
        } else if (message.type === "result" || message.type === "search-error") {
          const pending = this.pending.get(message.id);
          if (!pending) return;
          this.pending.delete(message.id);
          if (message.type === "search-error") pending.reject(new Error(message.error));
          else pending.resolve(message as SearchResult);
        }
      };

      worker.onerror = event => {
        const error = new Error(event.message || "Berserk worker failed.");
        this.fail(error);
        reject(error);
      };
      worker.postMessage({ type: "init", wasmUrl: WASM_URL });
    });

    this.ready.catch(() => {});
    return this.ready;
  }

  private fail(error: Error) {
    this.status = "error";
    this.error = error.message;
    this.emit();
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach(pending => pending.reject(error));
    this.pending.clear();
  }

  search(fen: string, milliseconds: number, multiPV = 1, context = "spectating"): Promise<SearchResult> {
    const run = async () => {
      await this.authorize(context);
      await this.start();
      await this.authorize(context);
      if (!this.worker) throw new Error("Berserk worker is unavailable.");
      const id = ++this.seq;
      return new Promise<SearchResult>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.worker!.postMessage({
          type: "search",
          id,
          fen,
          context,
          milliseconds: Math.max(100, Math.min(10_000, Math.round(milliseconds))),
          multiPV: Math.max(1, Math.min(8, Math.round(multiPV)))
        });
      });
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  stop() {
    this.worker?.terminate();
    this.worker = null;
    const error = new Error("Berserk worker stopped.");
    this.pending.forEach(pending => pending.reject(error));
    this.pending.clear();
    this.status = "idle";
    this.progress = 0;
    this.emit();
  }
}

export const engine = new BerserkEngine();
