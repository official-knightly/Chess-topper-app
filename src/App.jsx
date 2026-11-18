import React, { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("Checking desktop bridge…");
  const [lock, setLock] = useState({ locked: false, reason: null });

  useEffect(() => {
    const api = window.chessist;
    if (!api) {
      setStatus("Renderer preview · Electron bridge unavailable");
      return;
    }
    setStatus("Desktop shell ready");
    api.fairness.getState().then(setLock).catch(() => setStatus("Desktop bridge error"));
    return api.fairness.onChange(setLock);
  }, []);

  return (
    <main className="stage-one">
      <div className="brand-mark">♟</div>
      <p className="eyebrow">CHESSIST LOCAL · STAGE 01</p>
      <h1>Local chess.<br /><span>Clear thinking.</span></h1>
      <p className="description">The desktop foundation is online. The board and navigation arrive in Stage 2.</p>
      <section className="status-card">
        <div><span className="dot" />{status}</div>
        <div className={lock.locked ? "locked" : "unlocked"}>
          {lock.locked ? lock.reason : "Engine fairness lock · clear"}
        </div>
      </section>
      <p className="footnote">No overlays · No screen reading · No live-game assistance</p>
    </main>
  );
}
