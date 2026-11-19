// Chessist World Chess page adapter.
// Detects public player profiles and makes their official URL available to
// the extension. World Chess does not publish a documented public game/FEN API,
// so this adapter does not invent board data or claim live move analysis.
(() => {
  'use strict';
  const PROFILE_PATH = /^\/profile\/(\d+)(?:\/|$)/i;
  let lastUrl = '';
  function publishProfile() {
    const url = new URL(location.href);
    if (!['worldchess.com', 'www.worldchess.com'].includes(url.hostname)) return;
    const match = url.pathname.match(PROFILE_PATH);
    if (!match || url.href === lastUrl) return;
    lastUrl = url.href;
    const profile = { platform: 'worldchess', profileId: match[1], profileUrl: 'https://worldchess.com/profile/' + encodeURIComponent(match[1]), pageUrl: url.href };
    try {
      chrome.storage.local.set({ chessistWorldChessProfile: profile });
      window.dispatchEvent(new CustomEvent('chessist:worldchess-profile', { detail: profile }));
    } catch (_) {}
  }
  publishProfile();
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; publishProfile(); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', publishProfile);
})();
