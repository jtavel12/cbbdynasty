#!/usr/bin/env node
/**
 * Pulls real historical team-season data from barttorvik.com and writes it
 * to public/data/torvik-seasons.json for the app to use as its source of truth
 * for team strength/records instead of the synthetic random model.
 *
 * WHY THIS EXISTS / WHY YOU RUN IT (not Claude):
 * Bart Torvik publishes this data as open CSV/JSON files specifically so
 * people don't have to scrape the site — see his note here:
 * http://adamcwisports.blogspot.com/p/data.html
 * ("much of the data is available at the site in .csv and .json files...
 *   http://barttorvik.com/2019_team_results.csv gives final stats")
 * He also says he blocks IPs doing "mass scraping operations that are
 * detrimental to site performance" — so this script is intentionally slow
 * and polite: one request per season, with a pause between each, and it
 * caches results locally so you only ever pull a given year once.
 *
 * Usage:
 *   node scripts/import-torvik.mjs                # pulls 2008..current
 *   node scripts/import-torvik.mjs 2015 2020       # pulls a custom range
 */

import fs from "node:fs";
import path from "node:path";

const START_YEAR = Number(process.argv[2]) || 2008;
const END_YEAR = Number(process.argv[3]) || new Date().getFullYear();
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "torvik-seasons.json");
const CACHE_DIR = path.join(process.cwd(), ".torvik-cache");
const DELAY_MS = 1500; // be polite — one request per season, spaced out

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// team_results.csv columns (as published by barttorvik.com). Verify against
// the first row of a downloaded file if the site's format ever changes —
// this script prints a warning if the column count looks unexpected.
const COLUMNS = [
  "rank", "team", "conf", "record", "adjoe", "adjoe_rank", "adjde", "adjde_rank",
  "barthag", "proj_w", "proj_l", "proj_conf_w", "proj_conf_l", "conf_pct",
  "conf_sos_pct", "proj_conf_w2", "proj_conf_l2", "conf_sos_rk", "sos", "sos_rk",
  "ncsos", "ncsos_rk", "conf_id", "conf_win", "conf_loss", "wab", "wab_rk", "year",
];

async function fetchSeason(year) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${year}_team_results.csv`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  const url = `https://barttorvik.com/${year}_team_results.csv`;
  const res = await fetch(url, { headers: { "User-Agent": "cbb-dynasty-hobby-project/1.0 (personal use)" } });
  if (!res.ok) {
    throw new Error(`${year}: HTTP ${res.status} — ${url}`);
  }
  const text = await res.text();
  fs.writeFileSync(cachePath, text);
  return text;
}

function parseCsv(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(","));
}

function rowToTeamSeason(cols, year) {
  const obj = {};
  COLUMNS.forEach((key, i) => { obj[key] = cols[i]; });
  const [wins, losses] = (obj.record || "0-0").split("-").map(Number);
  return {
    team: obj.team,
    conf: obj.conf,
    year,
    wins: Number.isFinite(wins) ? wins : null,
    losses: Number.isFinite(losses) ? losses : null,
    adjOff: parseFloat(obj.adjoe) || null,
    adjDef: parseFloat(obj.adjde) || null,
    barthag: parseFloat(obj.barthag) || null, // T-Rank win probability vs an average team
  };
}

async function main() {
  console.log(`Pulling Bart Torvik team results for ${START_YEAR}-${END_YEAR}...`);
  const allSeasons = {};
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    try {
      const csv = await fetchSeason(year);
      const rows = parseCsv(csv);
      if (rows[0].length !== COLUMNS.length) {
        console.warn(`  ${year}: got ${rows[0].length} columns, expected ${COLUMNS.length} — the site's format may have changed. Check a row manually before trusting this year's data.`);
      }
      allSeasons[year] = rows.map((cols) => rowToTeamSeason(cols, year));
      console.log(`  ${year}: ${allSeasons[year].length} teams`);
    } catch (err) {
      console.warn(`  ${year}: failed (${err.message}) — skipping`);
    }
    await sleep(DELAY_MS);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(allSeasons));
  console.log(`\nWrote ${OUT_FILE}`);
  console.log("Next: wire this into App.jsx (see README 'Using real Torvik data') to replace the synthetic strength model with these real records/efficiency ratings.");
}

main();
