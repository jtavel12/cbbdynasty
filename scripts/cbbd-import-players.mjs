#!/usr/bin/env node
/**
 * Pulls real player rosters AND real season stats from the College
 * Basketball Data API, then writes public/data/torvik-players.json in a
 * shape the app uses to set BOTH a player's identity (name, position,
 * class year) AND their in-game rating — driven by real per-game
 * production, not a random roll. This fixes the earlier version, which
 * only had names/positions and so assigned skill totally at random
 * (e.g. a real star could land as a bench scrub by chance).
 *
 * Two endpoints, ~18 requests each for 2008-present (well inside the free
 * 1,000/month tier):
 *   GET /teams/roster?season=YYYY        -> name, position, startSeason
 *   GET /stats/player/season?season=YYYY -> points/rebounds/assists per game
 * Joined by player id where possible, falling back to name+team matching.
 *
 * I could not test this against the live API from my sandbox. The roster
 * endpoint's field names were confirmed correct by your last run; the
 * stats endpoint's exact shape is my best guess from client-library docs
 * (nested {total, perGame} objects are common in this API family) — the
 * script prints the raw shape it receives so we can fix the mapping fast
 * if it's off.
 *
 * SETUP: free key at https://collegebasketballdata.com/key (no account
 * needed, just an email form).
 *
 * Usage:
 *   CBBD_API_KEY=your-key node scripts/cbbd-import-players.mjs
 *   CBBD_API_KEY=your-key node scripts/cbbd-import-players.mjs 2015 2020
 */

import fs from "node:fs";
import path from "node:path";

const START_YEAR = Number(process.argv[2]) || 2008;
const END_YEAR = Number(process.argv[3]) || new Date().getFullYear();
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "torvik-players.json");
const CACHE_DIR = path.join(process.cwd(), ".torvik-cache");
const DELAY_MS = 1200;
const BASE = "https://api.collegebasketballdata.com";

const API_KEY = process.env.CBBD_API_KEY;
if (!API_KEY) {
  console.error("Set CBBD_API_KEY first. Get a free key at https://collegebasketballdata.com/key");
  console.error("Usage: CBBD_API_KEY=xxx node scripts/cbbd-import-players.mjs");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function cbbdGet(pathAndQuery, cacheName, year) {
  const cachePath = path.join(CACHE_DIR, `${year}_${cacheName}.json`);
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  const res = await fetch(`${BASE}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

function playerName(p) {
  return p.name ?? p.fullName ?? p.full_name ??
    ([p.firstName ?? p.first_name, p.lastName ?? p.last_name].filter(Boolean).join(" ") || null);
}

// Handles both flat numbers and {total, perGame} style nested stat objects.
function perGame(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "object") {
    if (typeof val.perGame === "number") return val.perGame;
    if (typeof val.total === "number") return val.total; // caller can divide by gp if needed
  }
  return null;
}

function normKey(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  console.log(`Pulling rosters + stats from CollegeBasketballData, ${START_YEAR}-${END_YEAR}...`);
  const out = {};
  let loggedRosterShape = false;
  let loggedStatsShape = false;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    try {
      const teamsData = await cbbdGet(`/teams/roster?season=${year}`, "roster", year);
      let statsData = [];
      try {
        statsData = await cbbdGet(`/stats/player/season?season=${year}`, "stats", year);
      } catch (err) {
        console.warn(`  ${year}: stats fetch failed (${err.message}) — ratings will fall back to generated for this year`);
      }

      if (!loggedRosterShape && teamsData.length) {
        console.log(`  (roster team keys: ${Object.keys(teamsData[0]).join(", ")})`);
        const fp = teamsData[0].players ?? teamsData[0].roster;
        if (fp?.length) console.log(`  (roster player keys: ${Object.keys(fp[0]).join(", ")})`);
        loggedRosterShape = true;
      }
      if (!loggedStatsShape && statsData.length) {
        console.log(`  (stats row keys: ${Object.keys(statsData[0]).join(", ")})`);
        loggedStatsShape = true;
      }

      // Index stats by player id first, then by normalized name+team as fallback.
      const statsById = new Map();
      const statsByNameTeam = new Map();
      for (const s of statsData) {
        const id = s.athleteId ?? s.playerId ?? s.id;
        const rec = {
          pts: perGame(s.points ?? s.pts),
          reb: perGame(s.rebounds ?? s.reb ?? s.totalRebounds),
          ast: perGame(s.assists ?? s.ast),
          gp: s.games ?? s.gamesPlayed ?? s.gp ?? null,
        };
        if (id != null) statsById.set(String(id), rec);
        const nameKey = normKey(playerName(s) ?? s.player) + "|" + normKey(s.team);
        statsByNameTeam.set(nameKey, rec);
      }

      const rows = [];
      for (const entry of teamsData) {
        const teamName = entry.team ?? entry.school ?? entry.teamName;
        const players = entry.players ?? entry.roster ?? [];
        for (const p of players) {
          const name = playerName(p);
          if (!name || !teamName) continue;
          const id = p.id ?? p.sourceId;
          const stat = (id != null && statsById.get(String(id))) ||
            statsByNameTeam.get(normKey(name) + "|" + normKey(teamName)) ||
            null;
          const startSeason = p.startSeason ?? p.start_season ?? null;
          rows.push({
            player: name,
            team: teamName,
            year,
            position: p.position ?? null,
            startSeason,
            hometown: p.hometown ?? null,
            ppg: stat?.pts ?? null,
            rpg: stat?.reb ?? null,
            apg: stat?.ast ?? null,
            gp: stat?.gp ?? null,
          });
        }
      }

      out[year] = rows;
      const withStats = rows.filter((r) => r.ppg != null).length;
      console.log(`  ${year}: ${rows.length} players (${withStats} with matched stats) across ${teamsData.length} teams`);
    } catch (err) {
      console.warn(`  ${year}: failed (${err.message})`);
    }
    await sleep(DELAY_MS);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  console.log(`\nWrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
