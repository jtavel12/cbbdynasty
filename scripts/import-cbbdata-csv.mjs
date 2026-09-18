#!/usr/bin/env node
/**
 * Patches ONE season of public/data/torvik-players.json using a CSV exported
 * from the `cbbdata` R package (github.com/andreweatherman/cbbdata), which
 * draws from Barttorvik and — critically — is NOT thin for seasons where our
 * primary CBBD pull is (2013 confirmed: CBBD had 1,804 rows for that season
 * vs. 5,000-10,000+ in neighboring years; cbbdata has 4,608, right in line
 * with 2011/2012/2014/2015). This only ever REPLACES the one year's key you
 * ask for — every other year in the file is left untouched.
 *
 * Column shape differences from our own CBBD-sourced rows, handled here:
 *   - cbbdata's ppg/rpg/apg are already PER-GAME; our schema stores season
 *     TOTALS (the app's perGame() helper divides by games everywhere), so
 *     these get multiplied back out by games played (g) on the way in.
 *   - cbbdata has a real `exp` class label (Fr/So/Jr/Sr) instead of our
 *     usual startSeason field — converted to an equivalent startSeason
 *     (Fr -> this year, So -> -1, Jr -> -2, Sr -> -3), the same "years back
 *     from class" logic the app already leans on elsewhere for real players
 *     whose true career start can't be otherwise determined.
 *   - cbbdata's position tags (Wing G, Pure PG, Scoring PG, Combo G, Wing F,
 *     Stretch 4, PF/C, C) are Barttorvik's own vocabulary, not the roster
 *     endpoint's verbose tags our position-resolution code already
 *     recognizes — mapped here to the same verbose tags (e.g. "Point
 *     Guard") so these rows flow through the EXISTING resolvePosition
 *     pipeline with no app code changes, using the app's own real
 *     per-game production to split the genuinely ambiguous combo tags
 *     (Combo G, PF/C) the same way the app already splits generic
 *     "Guard"/"Forward" tags from other real seasons.
 *   - No hometown data in this source — written as null, which the app's
 *     normalizeHometown() already handles gracefully (renders as "—").
 *
 * Usage:
 *   node scripts/import-cbbdata-csv.mjs <year> <path-to-csv>
 *   node scripts/import-cbbdata-csv.mjs 2013 ~/Downloads/cbbdata-2013.csv
 */

import fs from "node:fs";
import path from "node:path";

const YEAR = Number(process.argv[2]);
const CSV_PATH = process.argv[3];
const OUT_FILE = path.join(process.cwd(), "public", "data", "torvik-players.json");

if (!YEAR || !CSV_PATH) {
  console.error("Usage: node scripts/import-cbbdata-csv.mjs <year> <path-to-csv>");
  process.exit(1);
}
if (!fs.existsSync(CSV_PATH)) {
  console.error(`File not found: ${CSV_PATH}`);
  process.exit(1);
}

// Minimal CSV parser — good enough for R's write.csv() output (quoted
// strings, no embedded newlines inside fields, which write.csv never emits).
function parseCsv(text) {
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((key, i) => { row[key] = cells[i]; });
    return row;
  });
}
function splitCsvLine(line) {
  const out = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const EXP_YEARS_BACK = { Fr: 0, So: 1, Jr: 2, Sr: 3 };

// Same stat-based tiebreak logic the app already uses (splitGuard/splitBig
// in src/App.jsx) for generic combo tags — kept in sync by eye, not shared
// code, since this runs standalone at import time.
function splitGuard(apg, ppg) {
  const passSignal = apg - 1.9;
  const scoreSignal = (ppg - 6.5) * 0.15;
  return passSignal - scoreSignal >= 0 ? "Point Guard" : "Shooting Guard";
}
function splitBig(rpg) {
  return rpg >= 7 ? "Center" : "Power Forward";
}
function mapPosition(pos, apg, ppg, rpg) {
  switch (pos) {
    case "Pure PG": case "Scoring PG": return "Point Guard";
    case "Wing G": return "Shooting Guard";
    case "Wing F": return "Small Forward";
    case "Stretch 4": return "Power Forward";
    case "C": return "Center";
    case "Combo G": return splitGuard(apg, ppg);
    case "PF/C": return splitBig(rpg);
    default: return null; // let the app's own stat-based fallback handle it
  }
}

const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf-8"));
const out = [];
for (const r of rows) {
  const player = r.player;
  const g = Number(r.g) || 0;
  if (!player || g <= 0) continue;
  const ppg = Number(r.ppg) || 0;
  const rpg = Number(r.rpg) || 0;
  const apg = Number(r.apg) || 0;
  const expYearsBack = EXP_YEARS_BACK[r.exp];
  out.push({
    player,
    team: r.team,
    year: YEAR,
    position: mapPosition(r.pos, apg, ppg, rpg),
    startSeason: expYearsBack != null ? YEAR - expYearsBack : null,
    hometown: null,
    // Multiplied back out to season totals to match every other year's
    // shape in this file — see file header.
    ppg: Math.round(ppg * g * 10) / 10,
    rpg: Math.round(rpg * g * 10) / 10,
    apg: Math.round(apg * g * 10) / 10,
    gp: g,
  });
}

let existing = {};
if (fs.existsSync(OUT_FILE)) {
  existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
}
const previousCount = (existing[String(YEAR)] || []).length;
existing[String(YEAR)] = out;
fs.writeFileSync(OUT_FILE, JSON.stringify(existing));

console.log(`Year ${YEAR}: ${previousCount} rows -> ${out.length} rows`);
console.log(`Written to ${OUT_FILE}`);
