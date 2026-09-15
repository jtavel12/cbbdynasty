# CBB Dynasty

## Run it locally
```
npm install
npm run dev
```
Opens at http://localhost:5173

## Build for production
```
npm run build
```
Outputs a static site to `dist/` — this is what you deploy.

## Deploy (easiest: Vercel)
1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. Vercel auto-detects Vite; leave the defaults and click Deploy.
4. You get a live URL (e.g. `cbb-dynasty.vercel.app`) that rebuilds automatically on every push.

Netlify works the same way (New site from Git), or for a one-off you can drag the `dist/` folder onto netlify.com/drop after running `npm run build`.

## Real player names

Two earlier attempts at this were dead ends: `api.cbbstat.com` (a package
archived in 2024) and `cbbdata.com` (not resolving at all when tested).
Third attempt landed on solid ground: the **College Basketball Data API**
(`api.collegebasketballdata.com`) — the basketball sister project to the
well-known CollegeFootballData.com, actively maintained, with live docs
updated as recently as September 2026. Confirmed working, not guessed at.

**Get a free key** (just an email form, no account/password to manage):
[collegebasketballdata.com/key](https://collegebasketballdata.com/key)

**Then pull the data:**
```
CBBD_API_KEY=your-key node scripts/cbbd-import-players.mjs
```

Its `/teams/roster?season=YYYY` endpoint returns every team's full roster
for a season in one call, so this only needs ~18 requests total for
2008-present — comfortably inside the free tier's 1,000 calls/month. It
writes `src/data/torvik-players.json` (kept the filename the app already
reads) and prints the raw field names it receives the first time it
succeeds — I mapped names from the official client docs but couldn't test
live from my sandbox, so if the printed keys don't match what the script
expects, paste them to me and I'll fix the mapping.

This is wired into the sim the same way as before: `buildInitialRoster()`
pulls real names for your team's 2008 roster wherever a match is found
(marked with "•" on the Roster tab). Team-name matching uses the same
`TORVIK_TEAM_ALIASES` fuzzy-match system as the team-data import.

## Pulling real team data (Bart Torvik)

Unlike Sports-Reference and 247Sports, Bart Torvik (barttorvik.com) publishes
team-season results as open CSV/JSON files specifically so people don't have
to scrape the site — [see his note here](http://adamcwisports.blogspot.com/p/data.html).
This covers real win-loss records, conference, and efficiency ratings (adjusted
offense/defense, "barthag" win probability) for every D-I team, every season
back to 2008.

Run this from your machine (mine can't reach barttorvik.com from this sandbox):

```
node scripts/import-torvik.mjs
```

This pulls one request per season (2008 through the current year), 1.5s apart,
and caches each year's raw file in `.torvik-cache/` so re-runs don't re-hit the
site. It writes `src/data/torvik-seasons.json` — **this is now wired into the
sim**: `teamPowerRating()` in `App.jsx` checks this file first for a real
team+year match (using each team's real `barthag` rating) and only falls back
to the synthetic prestige-based model when there's no real data for that
team/year. This affects opponent strength in game simulation and the
Standings tab.

**Heads up:** I derived the CSV column layout in `scripts/import-torvik.mjs`
from general knowledge of Torvik's format, not by inspecting a live file (I
can't reach the domain from here). The script warns you if a row's column
count looks wrong — check `.torvik-cache/2024_team_results.csv` against
`torvik-seasons.json` after your first run to confirm the columns lined up.

**Team name matching:** Torvik's team-name strings don't always match ours
1:1 (e.g. "Connecticut" vs "UConn"). `TORVIK_TEAM_ALIASES` near the top of
`App.jsx` covers the mismatches I'm fairly confident about; everything else
falls back to a fuzzy contains-match. If a team you're playing as doesn't
seem to be picking up real data, check the browser console for hints and
extend that alias map.



## Notes
- Save data currently lives in the browser's localStorage (see `src/main.jsx`), so a save only exists on the device/browser it was created in. To make saves follow a user across devices, swap that shim for calls to a real backend + database.
- Player attributes/stats are still simulated even where real names are used — Sports-Reference and 247Sports don't allow automated scraping, so box-score-accurate stats aren't wired in.
- The team list (`TEAMS` in `App.jsx`) now includes all 365 current D-I programs, pulled from Wikipedia's program list. Prestige tiers (1-5) are derived from each team's real NCAA tournament appearances/Final Fours/championships, not hand-picked.

## Real recruiting classes

Each season's recruiting board now pulls from **real players whose real
careers started that year** — true freshmen and transfers/JUCO signees,
sourced from the same roster data (matched via `startSeason === year`) —
instead of a fully generated prospect pool. Their in-game rating is derived
from their actual first-season production (points/rebounds/assists), the
same real-stats-driven system used for existing rosters. You still compete
for them with the same call/visit/offer/sign system; winning one pulls them
onto your roster even if that's not who they signed with in reality — that
divergence from real history is the point of a dynasty mode.

This only applies to years where you've imported real data (2008–2026 as of
your last pull). Years outside that range fall back to the fully generated
system as before.

## Roster size (10–13 players)

Rosters are now built and maintained within a realistic 10-13 range at every
point in the sim:
- **Initial rosters** vary randomly within that range rather than a fixed 12.
- **Year-to-year**, if graduating seniors would drop a team below 10, the
  sim automatically fills the gap with generated walk-on-tier freshmen at
  whatever position is thinnest — so a team that doesn't recruit hard enough
  won't end up unrealistically short-handed.
- The existing 13-man ceiling (trimming the weakest bench players when a
  big class pushes you over) still applies.

## Fixed: wrong-team name matching

The earlier fuzzy "contains" matching (e.g. "Ohio" matching into "Ohio
State" rows) was removed — that's almost certainly what caused the wrong
players showing up on some teams. Matching is now **exact-name-only**
(direct match or an explicit alias in `TORVIK_TEAM_ALIASES`), which trades
away some coverage for correctness: fewer teams will show real data right
now, but none of it should be *wrong* data.

**To get coverage back up**, I need to see CBBD's actual team-name strings —
run this from inside the project and paste me the output:
```
node -e "const d=JSON.parse(require('fs').readFileSync('src/data/torvik-players.json')); const teams=[...new Set(d[2024].map(r=>r.team))].sort(); console.log(teams.length+' unique team names'); console.log(teams.slice(0,40).join('\n'));"
```
Once I see the real convention, I can build out a complete, correct alias
table instead of guessing. In the meantime, open your browser console while
playing — unmatched teams are logged there once per session, which is the
list to hand me for expanding the alias map.
