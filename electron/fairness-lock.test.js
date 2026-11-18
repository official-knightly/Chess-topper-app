const test = require("node:test");
const assert = require("node:assert/strict");
const { FairnessLock } = require("./fairness-lock");

test("rejects analysis while the user is in an active online game", () => {
  const lock = new FairnessLock();
  lock.updateGame({ platform: "lichess", gameId: "abc", status: "started", userIsParticipant: true });
  assert.equal(lock.isLocked(), true);
  assert.throws(() => lock.assertCanAnalyze(), error => error.code === "ENGINE_LOCKED");
});

test("unlocks automatically when the game ends", () => {
  const lock = new FairnessLock();
  lock.updateGame({ platform: "lichess", gameId: "abc", status: "started", userIsParticipant: true });
  lock.updateGame({ platform: "lichess", gameId: "abc", status: "finished", userIsParticipant: true });
  assert.equal(lock.isLocked(), false);
  assert.doesNotThrow(() => lock.assertCanAnalyze());
});

test("spectating another player's game does not lock analysis", () => {
  const lock = new FairnessLock();
  lock.updateGame({ platform: "lichess", gameId: "tv-1", status: "started", userIsParticipant: false });
  assert.equal(lock.isLocked(), false);
});

test("one finished game does not unlock another active participant game", () => {
  const lock = new FairnessLock();
  lock.updateGame({ platform: "lichess", gameId: "a", status: "started", userIsParticipant: true });
  lock.updateGame({ platform: "chesscom", gameId: "b", status: "started", userIsParticipant: true });
  lock.updateGame({ platform: "lichess", gameId: "a", status: "finished", userIsParticipant: true });
  assert.equal(lock.isLocked(), true);
});
