#!/usr/bin/env node
/**
 * Inspects the real data pulled for ONE team+year, the same way you'd
 * look at a roster in-game -- so we can see whether a "wrong-looking"
 * roster is a data problem (missing stats, bad position strings) or an
 * app-logic problem (slot assignment, position mapping).
 *
 * Usage:
 *   node scripts/check-roster.mjs "Hofstra" 2024
 *   node scripts/check-roster.mjs "Duke"
 */

import fs from "node:fs";

const teamArg = process.argv[2];
const year = process.argv[3] || "2024";

if (!teamArg) {
  console.error('Usage: node scripts/check-roster.mjs "Team Name" [year]');
  process.exit(1);
}

// Keep in sync with TORVIK_TEAM_ALIASES / mapRealPosition in src/App.jsx
const TORVIK_TEAM_ALIASES = {
  "Pitt": "Pittsburgh",
  "UMaine": "Maine",
  "FAU": "Florida Atlantic",
  "New Jersey Institute of Technology": "NJIT",
  "Miami (FL)": "Miami",
  "Queens University of Charlotte": "Queens University",
  "Saint Joe's": "Saint Joseph's",
  "USC Upstate": "South Carolina Upstate",
  "CSU Bakersfield": "Cal State Bakersfield",
  "FIU": "Florida International",
  "Penn": "Pennsylvania",
  "UMass": "Massachusetts",
  "SC State": "South Carolina State",
  "Valpo": "Valparaiso",
  "San Jose State": "San José State",
  "Long Island": "Long Island University",
  "Southeast Missouri": "Southeast Missouri State",
  "American": "American University",
  "Mizzou": "Missouri",
  "Vandy": "Vanderbilt",
  "Citadel": "The Citadel",
  "Virginia Military Institute": "VMI",
  "LSU New Orleans": "New Orleans",
  "Southeastern Louisiana": "SE Louisiana",
  "Texas A&M University-Corpus Christi": "Texas A&M-Corpus Christi",
  "Grambling State": "Grambling",
  "Appalachian State": "App State",
  "Seattle": "Seattle U",
};

function normalizeTeamKey(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapRealPosition(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.includes("point")) return "PG";
  if (s.includes("shooting")) return "SG";
  if (s.includes("center")) return "C";
  if (s.includes("power")) return "PF";
  if (s.includes("forward")) return "SF";
  if (s === "g" || s.includes("guard")) return "SG";
  if (s === "f") return "SF";
  if (s === "c") return "C";
  return null;
}

const data = JSON.parse(fs.readFileSync("src/data/torvik-players.json", "utf-8"));
const rows = data[year];
if (!rows || !rows.length) {
  console.error(`No data for ${year}.`);
  process.exit(1);
}

const alias = TORVIK_TEAM_ALIASES[teamArg];
const target = normalizeTeamKey(alias || teamArg);
const matched = rows.filter((r) => normalizeTeamKey(r.team) === target);

if (!matched.length) {
  console.log(`No exact match for "${teamArg}" (tried "${alias || teamArg}") in ${year}.`);
  const realTeams = [...new Set(rows.map((r) => r.team))];
  const loose = realTeams.filter((t) => normalizeTeamKey(t).includes(target.slice(0, 5)));
  if (loose.length) console.log("Similar real team names that DO exist:", loose.join(", "));
  process.exit(0);
}

console.log(`${teamArg} (matched as "${matched[0].team}"), ${year}: ${matched.length} players\n`);

let withStats = 0;
let unmappedPos = 0;

for (const p of matched) {
  const mapped = mapRealPosition(p.position) || "??";
  if (mapped === "??") unmappedPos++;
  const hasStats = p.ppg != null;
  if (hasStats) withStats++;
  const statStr = hasStats
    ? `${p.ppg?.toFixed(1)} ppg, ${p.rpg?.toFixed(1)} rpg, ${p.apg?.toFixed(1)} apg`
    : "NO STATS (will use generated rating)";
  const rawPos = p.position ?? "(none)";
  console.log(`  ${p.player.padEnd(24)} raw pos: ${String(rawPos).padEnd(10)} -> ${mapped}   startSeason: ${p.startSeason ?? "?"}   ${statStr}`);
}

console.log(`\n${withStats}/${matched.length} players have matched real stats.`);
console.log(`${unmappedPos}/${matched.length} players have an unmapped/unrecognized position string.`);
