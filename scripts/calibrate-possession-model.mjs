#!/usr/bin/env node
/**
 * A throwaway calibration check, not part of the app: verifies that Coach
 * Mode's per-possession scoring model (livePossession's `scoreProb`, in
 * src/App.jsx) produces a full-game win rate that tracks gameWinProb — the
 * curve every AUTO-simmed game (Sim Game, Sim Rest of Season, postseason
 * auto-sim) already uses to turn a talent gap into a win probability.
 *
 * Written after a bug report: a user won back-to-back national titles,
 * undefeated, with a 70-overall Saint Joseph's roster. Investigation found
 * gameWinProb correctly gave a 70-overall team only a ~2-3% chance against a
 * blue blood, but Coach Mode's live possession-by-possession model (played
 * every game interactively) gave the SAME matchup a ~16-20% win rate — an
 * 8-10x more forgiving model for exactly the same talent gap. That gap is
 * what let a mediocre team compound enough "lucky" wins across a season (and
 * then a second season) to run the table, something the auto-sim curve would
 * make astronomically unlikely.
 *
 * The fix: raise the possession model's power-gap coefficient (0.0028 ->
 * 0.005) so it closely matches gameWinProb across the realistic power range
 * (teams span roughly 25-95). Re-run this after touching either formula to
 * confirm they still agree — it should NOT need a fixed coefficient forever
 * if gameWinProb's own slope (currently 1/27) ever changes.
 *
 * Usage: node scripts/calibrate-possession-model.mjs [coefficient]
 */

const COEF = Number(process.argv[2]) || 0.005;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function livePossession({ offMe, myPower, oppPower, coef }) {
  const net = offMe ? myPower - oppPower : oppPower - myPower;
  const scoreProb = clamp(0.47 + net * coef, 0.28, 0.7);
  return Math.random() < scoreProb;
}

function playGame(myPower, oppPower, T, coef) {
  let my = 0, opp = 0;
  for (let event = 0; event < 2 * T; event++) {
    const offMe = event % 2 === 0;
    if (livePossession({ offMe, myPower, oppPower, coef })) {
      const pts = Math.random() < 0.33 ? 3 : 2;
      if (offMe) my += pts; else opp += pts;
    }
  }
  return my > opp;
}

function trial(myPower, oppPower, n, coef) {
  let wins = 0;
  for (let i = 0; i < n; i++) if (playGame(myPower, oppPower, 65, coef)) wins++;
  return wins / n;
}

// The same curve gameWinProb() uses in src/App.jsx — kept in sync by eye.
function gameWinProb(power, oppPower) {
  return clamp(0.5 + (power - oppPower) / 27, 0.02, 0.98);
}

const N = 15000;
const diffs = [-25, -15, -13, -10, -8, -5, -3, 0, 3, 5, 8, 10, 13, 15, 25];
console.log(`Coach Mode possession model vs. gameWinProb, coefficient = ${COEF}\n`);
let sse = 0;
for (const diff of diffs) {
  const my = 70, opp = 70 - diff;
  const target = gameWinProb(my, opp);
  const actual = trial(my, opp, N, COEF);
  sse += (target - actual) ** 2;
  console.log(`diff=${String(diff).padStart(4)}  target=${target.toFixed(3)}  sim=${actual.toFixed(3)}  err=${(actual - target).toFixed(3)}`);
}
console.log(`\nSSE across sampled diffs: ${sse.toFixed(4)} (lower is a closer match)`);
