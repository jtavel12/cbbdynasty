#!/usr/bin/env node
/**
 * Checks all 365 of our D-I team names against the real team-name strings
 * in public/data/torvik-players.json, using the same exact-match + alias
 * logic as the app itself. Prints:
 *   - how many matched cleanly
 *   - every MISS, with up to 3 candidate real names that share a
 *     significant word (for you to eyeball and confirm -- nothing here
 *     is auto-applied)
 *
 * Run this after pulling real data, then paste me the MISS section and
 * I will turn the confirmed ones into TORVIK_TEAM_ALIASES entries.
 *
 * Usage: node scripts/check-team-matches.mjs [year]
 */

import fs from "node:fs";

const year = process.argv[2] || "2024";

const OUR_TEAMS = ["Albany", "Binghamton", "Bryant", "UMaine", "UMBC", "UMass Lowell", "New Hampshire", "New Jersey Institute of Technology", "Vermont", "Charlotte", "East Carolina", "FAU", "Memphis", "North Texas", "Rice", "South Florida", "Temple", "UAB", "UTSA", "Tulane", "Tulsa", "Wichita State", "Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (FL)", "North Carolina", "NC State", "Notre Dame", "Pitt", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest", "Bellarmine", "Florida Gulf Coast", "Jacksonville", "Lipscomb", "North Florida", "Queens University of Charlotte", "Stetson", "West Florida", "Davidson", "Dayton", "Duquesne", "Fordham", "George Mason", "George Washington", "La Salle", "Loyola Chicago", "Rhode Island", "Richmond", "St. Bonaventure", "Saint Joe's", "Saint Louis", "VCU", "Butler", "Creighton", "DePaul", "Georgetown", "Marquette", "Providence", "St. John's", "Seton Hall", "UConn", "Villanova", "Xavier", "Eastern Washington", "Idaho", "Idaho State", "Montana", "Montana State", "Northern Arizona", "Northern Colorado", "Portland State", "Southern Utah", "Utah Tech", "Weber State", "Charleston Southern", "Gardner\u2013Webb", "High Point", "Longwood", "Presbyterian", "Radford", "UNC Asheville", "USC Upstate", "Winthrop", "UCLA", "Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "USC", "Washington", "Wisconsin", "Arizona", "Arizona State", "Baylor", "BYU", "UCF", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "Utah", "West Virginia", "California Baptist", "Cal Poly", "CSU Bakersfield", "Cal State Fullerton", "Cal State Northridge", "Long Beach State", "Sacramento State", "UC Irvine", "UC Riverside", "UC San Diego", "UC Santa Barbara", "Utah Valley", "Campbell", "Charleston", "Drexel", "Elon", "Hampton", "Hofstra", "Monmouth", "North Carolina A&T", "Northeastern", "Stony Brook", "Towson", "UNC Wilmington", "William & Mary", "Delaware", "FIU", "Jacksonville State", "Kennesaw State", "Liberty", "Middle Tennessee", "Missouri State", "New Mexico State", "Sam Houston", "Western Kentucky", "Cleveland State", "Detroit Mercy", "IU Indy", "Milwaukee", "Northern Illinois", "Northern Kentucky", "Oakland", "Purdue Fort Wayne", "Robert Morris", "Green Bay", "Wright State", "Youngstown State", "Brown", "Columbia", "Cornell", "Dartmouth", "Harvard", "Penn", "Princeton", "Yale", "Canisius", "Fairfield", "Iona", "Manhattan", "Marist", "Merrimack", "Mount St. Mary's", "Niagara", "Quinnipiac", "Rider", "Sacred Heart", "Saint Peter's", "Siena", "Akron", "Ball State", "Bowling Green", "Buffalo", "Central Michigan", "Eastern Michigan", "Kent State", "UMass", "Miami (OH)", "Ohio", "Toledo", "Western Michigan", "Coppin State", "Delaware State", "Howard", "Maryland Eastern Shore", "Morgan State", "Norfolk State", "North Carolina Central", "SC State", "Belmont", "Bradley", "Drake", "Evansville", "Illinois State", "Indiana State", "Murray State", "Northern Iowa", "Southern Illinois", "UIC", "Valpo", "Air Force", "Grand Canyon", "Hawaii", "Nevada", "New Mexico", "San Jose State", "UC Davis", "UNLV", "UTEP", "Wyoming", "Central Connecticut", "Chicago State", "Fairleigh Dickinson", "Le Moyne", "Long Island", "Mercyhurst", "New Haven", "Stonehill", "Wagner", "Eastern Illinois", "Lindenwood", "Morehead State", "Southeast Missouri", "SIU Edwardsville", "Southern Indiana", "UT Martin", "Tennessee State", "Western Illinois", "Boise State", "Colorado State", "Fresno State", "Gonzaga", "Oregon State", "San Diego State", "Texas State", "Utah State", "Washington State", "American", "Army", "Boston University", "Bucknell", "Colgate", "Holy Cross", "Lafayette", "Lehigh", "Loyola Maryland", "Navy", "Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Ole Miss", "Mississippi State", "Mizzou", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vandy", "Chattanooga", "Citadel", "East Tennessee State", "Furman", "Mercer", "Samford", "Tennessee Tech", "UNC Greensboro", "Virginia Military Institute", "Western Carolina", "Wofford", "East Texas A&M", "Houston Christian", "Incarnate Word", "Lamar", "LSU New Orleans", "McNeese", "Nicholls", "Northwestern State", "Southeastern Louisiana", "Stephen F. Austin", "Texas A&M University-Corpus Christi", "UT Rio Grande Valley", "Alabama A&M", "Alabama State", "Alcorn State", "Arkansas\u2013Pine Bluff", "Bethune\u2013Cookman", "Florida A&M", "Grambling State", "Jackson State", "Mississippi Valley State", "Prairie View A&M", "Southern", "Texas Southern", "Kansas City", "North Dakota", "North Dakota State", "Omaha", "Oral Roberts", "St. Thomas", "South Dakota", "South Dakota State", "Appalachian State", "Arkansas State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Louisiana", "Louisiana\u2013Monroe", "Louisiana Tech", "Marshall", "Old Dominion", "South Alabama", "Southern Miss", "Troy", "Abilene Christian", "Austin Peay", "Central Arkansas", "Eastern Kentucky", "Little Rock", "North Alabama", "Tarleton State", "UT Arlington", "West Georgia", "Denver", "Loyola Marymount", "Pacific", "Pepperdine", "Portland", "Saint Mary's", "San Diego", "San Francisco", "Santa Clara", "Seattle"];

// Keep this in sync with TORVIK_TEAM_ALIASES in src/App.jsx
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
  "San Jose State": "San Jos\u00e9 State",
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

function significantWords(name) {
  const stop = new Set(["of", "the", "at", "state", "st", "university", "college"]);
  return name.toLowerCase().replace(/[()]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
}

const data = JSON.parse(fs.readFileSync("public/data/torvik-players.json", "utf-8"));
const rows = data[year];
if (!rows || !rows.length) {
  console.error(`No data for ${year} in torvik-players.json. Try a different year: node scripts/check-team-matches.mjs 2023`);
  process.exit(1);
}

const realTeams = [...new Set(rows.map((r) => r.team))];
const realByKey = new Map(realTeams.map((t) => [normalizeTeamKey(t), t]));

let matched = 0;
const misses = [];

for (const ourName of OUR_TEAMS) {
  const alias = TORVIK_TEAM_ALIASES[ourName];
  const key = normalizeTeamKey(alias || ourName);
  if (realByKey.has(key)) {
    matched++;
    continue;
  }
  const ourWords = new Set(significantWords(ourName));
  const scored = realTeams
    .map((rt) => {
      const rtWords = significantWords(rt);
      const overlap = rtWords.filter((w) => ourWords.has(w)).length;
      return { rt, overlap };
    })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map((s) => s.rt);
  misses.push({ ourName, candidates: scored });
}

console.log(`Year ${year}: ${realTeams.length} unique real team names in the data.`);
console.log(`MATCHED: ${matched} / ${OUR_TEAMS.length}`);
console.log(`MISSED: ${misses.length}\n`);

for (const m of misses) {
  const cand = m.candidates.length ? m.candidates.join(" | ") : "(no obvious candidate)";
  console.log(`MISS: "${m.ourName}" -> ${cand}`);
}
