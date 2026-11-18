/**
 * Main-process fairness gate.
 * A participant's active online game locks every engine analysis request.
 */
const ACTIVE_STATUSES = new Set(["created", "started", "playing", "active"]);

class FairnessLock {
  constructor() {
    this.games = new Map();
  }

  updateGame({ platform, gameId, status, userIsParticipant }) {
    if (!platform || !gameId) throw new TypeError("platform and gameId are required");
    const key = `${platform}:${gameId}`;
    if (!userIsParticipant || !ACTIVE_STATUSES.has(String(status || "").toLowerCase())) {
      this.games.delete(key);
    } else {
      this.games.set(key, { platform, gameId, status, userIsParticipant: true });
    }
    return this.snapshot();
  }

  isLocked() {
    return this.games.size > 0;
  }

  assertCanAnalyze() {
    if (this.isLocked()) {
      const error = new Error("Engine locked: game in progress");
      error.code = "ENGINE_LOCKED";
      throw error;
    }
  }

  snapshot() {
    return {
      locked: this.isLocked(),
      reason: this.isLocked() ? "Locked: game in progress" : null,
      activeGames: [...this.games.values()].map(({ platform, gameId, status }) => ({ platform, gameId, status }))
    };
  }

  clearPlatform(platform) {
    for (const [key, game] of this.games) {
      if (game.platform === platform) this.games.delete(key);
    }
    return this.snapshot();
  }
}

module.exports = { FairnessLock, ACTIVE_STATUSES };
