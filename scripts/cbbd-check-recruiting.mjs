#!/usr/bin/env node
/**
 * A throwaway probe, not an importer: hits the College Basketball Data
 * API's recruiting endpoint for one season and prints the raw shape it
 * returns, so we can see what real fields (stars, composite rank, hometown,
 * committed school, etc.) are actually available before writing anything
 * that parses or stores this data.
 *
 * CBBD is documented as basketball's sibling to CollegeFootballData.com, and
 * CFBD's recruiting endpoint is GET /recruiting/players?year=YYYY — this
 * probe tries the same path on CBBD. Unconfirmed against the live API from
 * this sandbox, same as the roster/stats endpoints were before your first
 * run — if this 404s or the shape looks different, paste me the output and
 * I'll adjust.
 *
 * Usage:
 *   CBBD_API_KEY=your-key node scripts/cbbd-check-recruiting.mjs 2026
 */

const YEAR = Number(process.env.CBBD_YEAR || process.argv[2]) || 2026;
const BASE = "https://api.collegebasketballdata.com";

const API_KEY = process.env.CBBD_API_KEY;
if (!API_KEY) {
  console.error("Set CBBD_API_KEY first. Get a free key at https://collegebasketballdata.com/key");
  console.error("Usage: CBBD_API_KEY=xxx node scripts/cbbd-check-recruiting.mjs [year]");
  process.exit(1);
}

async function main() {
  const url = `${BASE}/recruiting/players?year=${YEAR}`;
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  console.log(`Status: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Body:", text.slice(0, 500));
    process.exit(1);
  }
  const data = await res.json();
  console.log(`\nRows returned: ${Array.isArray(data) ? data.length : "(not an array)"}`);
  if (Array.isArray(data) && data.length) {
    console.log(`\nField names on row 0:`, Object.keys(data[0]));
    console.log(`\nFirst 3 rows, raw:`);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } else {
    console.log("\nRaw response:", JSON.stringify(data, null, 2).slice(0, 1000));
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
