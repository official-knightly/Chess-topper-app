const test = require("node:test");
const assert = require("node:assert/strict");
const { parseUciInfo } = require("./engine");

test("parses UCI depth, score, throughput and principal variation", () => {
  const info = parseUciInfo("info depth 22 seldepth 31 multipv 1 score cp 34 nodes 120000 nps 900000 time 133 pv e2e4 e7e5 g1f3");
  assert.equal(info.depth, 22);
  assert.deepEqual(info.score, { type: "cp", value: 34 });
  assert.equal(info.nps, 900000);
  assert.deepEqual(info.pv, ["e2e4", "e7e5", "g1f3"]);
});

test("parses mate scores and ignores non-info lines", () => {
  assert.equal(parseUciInfo("uciok"), null);
  assert.deepEqual(parseUciInfo("info depth 9 score mate -3 pv a1a8").score, { type: "mate", value: -3 });
});
