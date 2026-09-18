#!/usr/bin/env node
/**
 * Pulls real HS recruiting-rankings data (stars, composite rating, national
 * ranking at signing) from the College Basketball Data API and writes it to
 * public/data/recruiting-rankings.json for the app to use as the recruiting
 * board for the one signing class real roster/stats data can never reach on
 * its own: a recruit's commitment is public well before their season is
 * played, so this class is real even though real box scores for their season
 * don't exist anywhere yet.
 *
 * IMPORTANT — the year offset: the API labels a recruiting class by the
 * calendar year those recruits enroll (e.g. year=2026 means "entering
 * college in fall 2026"), but our own roster data (torvik-players.json) is
 * keyed by each SEASON'S ENDING year (fall 2026 -> the 2026-27 season ->
 * key "2027"). Confirmed directly: Cameron Boozer appears in the recruiting
 * endpoint under year=2025 (committed to Duke) AND in torvik-players.json's
 * "2026" entries as a real true freshman (startSeason: 2026, same Miami, FL
 * hometown) — one full year of offset between the two conventions. This
 * script resolves that once, here, at import time: pass the API's own
 * recruiting-class year, and it's written to the ROSTER-year key (+1) so
 * nothing downstream needs to know about the offset at all.
 *
 * Existing years in the output file are preserved — this only touches the
 * one year you import, so re-running it for a different class later doesn't
 * clobber this one.
 *
 * Usage:
 *   CBBD_API_KEY=your-key CBBD_YEAR=2026 node scripts/cbbd-import-recruiting.mjs
 *
 * CBBD_YEAR=2026 is the class that includes Tyran Stokes (Kansas commit,
 * #1 overall) — it enrolls fall 2026, i.e. the 2026-27 season, written here
 * under roster-year key "2027".
 */

import fs from "node:fs";
import path from "node:path";

const RECRUITING_YEAR = Number(process.env.CBBD_YEAR) || 2026;
const ROSTER_YEAR = RECRUITING_YEAR + 1;
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "recruiting-rankings.json");
const BASE = "https://api.collegebasketballdata.com";

const API_KEY = process.env.CBBD_API_KEY;
if (!API_KEY) {
  console.error("Set CBBD_API_KEY first. Get a free key at https://collegebasketballdata.com/key");
  console.error("Usage: CBBD_API_KEY=xxx CBBD_YEAR=2026 node scripts/cbbd-import-recruiting.mjs");
  process.exit(1);
}

async function main() {
  const url = `${BASE}/recruiting/players?year=${RECRUITING_YEAR}`;
  console.log(`Pulling recruiting class ${RECRUITING_YEAR} (-> roster year ${ROSTER_YEAR})...`);
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("Unexpected response shape (not an array) — API may have changed.");

  const cleaned = rows
    .filter((r) => r.name && r.stars != null)
    .map((r) => ({
      name: r.name,
      position: r.position ?? null,
      hometown: r.hometown ?? null,
      stars: r.stars,
      rating: r.rating,
      ranking: r.ranking ?? null,
      heightInches: r.heightInches ?? null,
      weightPounds: r.weightPounds ?? null,
    }));

  let existing = {};
  if (fs.existsSync(OUT_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8")); } catch { existing = {}; }
  }
  existing[String(ROSTER_YEAR)] = cleaned;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(existing));
  console.log(`\n${cleaned.length} recruits written under roster-year "${ROSTER_YEAR}" in ${OUT_FILE}`);
  console.log(`Years now in the file: ${Object.keys(existing).sort().join(", ")}`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
