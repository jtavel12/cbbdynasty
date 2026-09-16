import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import torvikSeasonsRaw from "./data/torvik-seasons.json";
import torvikPlayersRaw from "./data/torvik-players.json";
import teamLocationsRaw from "./data/team-locations.json";
import teamRecordsRaw from "./data/team-records.json";
import {
  LayoutDashboard, Users, ListOrdered, Search, CalendarDays, Trophy,
  Save, RotateCcw, ChevronUp, ChevronDown, Play, FastForward, Star,
  ShieldCheck, X, Check, TrendingUp, TrendingDown, Award, Crown,
  Medal, HeartPulse, Swords, Flame, GraduationCap, Landmark, Lock,
  Clock, Gauge, Zap, Minus, Timer
} from "lucide-react";

/* =========================================================================
   COLOR / TYPE TOKENS  (arena-at-night / broadcast scoreboard aesthetic)
   ========================================================================= */
const C = {
  bg: "#f6e35a",
  bgRail: "#eabc0e",
  panel: "#fffbea",
  panelAlt: "#fdf2b8",
  line: "#d4ad1a",
  cream: "#211c04",
  dim: "#5c5327",
  dimmer: "#8a7f45",
  wood: "#c1652f",
  woodDim: "#8a4a24",
  gold: "#a8791f",
  green: "#3f7d52",
  red: "#c0463c",
  blue: "#3a63a0",
};

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

// The granular attribute model. Every player carries a rating for each of
// these; a position's overall is a weighted blend of them (POS_WEIGHTS below).
// Because the blend differs by position, the SAME attribute set produces a
// different overall at each slot — which is how playing out of position costs
// value (a pass-first PG graded under center weights loses his strengths).
const ATTR_KEYS = [
  "scoring", "threePoint", "rebounding", "passing", "ballHandling",
  "steals", "blocks", "perimeterDefense", "postDefense", "athleticism",
];
const ATTR_LABELS = {
  scoring: "Scoring", threePoint: "3PT Shooting", rebounding: "Rebounding",
  passing: "Passing", ballHandling: "Ball Handling", steals: "Steals",
  blocks: "Blocks", perimeterDefense: "Perimeter D", postDefense: "Post D",
  athleticism: "Athleticism",
};
// How guard-like each slot is (1 = pure point guard, 0 = pure center). Drives
// which attributes a position leans on and biases attribute generation so
// guards handle/shoot and bigs rebound/protect the rim.
const POS_GUARDNESS = { PG: 1, SG: 0.72, SF: 0.5, PF: 0.28, C: 0 };

// Per-position weights over the 10 attributes. Each row sums to 1.0 so overalls
// stay on the same 40-99 band regardless of position.
const POS_WEIGHTS = {
  PG: { scoring: 0.12, threePoint: 0.12, rebounding: 0.03, passing: 0.20, ballHandling: 0.20, steals: 0.08, blocks: 0.01, perimeterDefense: 0.13, postDefense: 0.04, athleticism: 0.07 },
  SG: { scoring: 0.20, threePoint: 0.20, rebounding: 0.06, passing: 0.08, ballHandling: 0.12, steals: 0.07, blocks: 0.02, perimeterDefense: 0.13, postDefense: 0.04, athleticism: 0.08 },
  SF: { scoring: 0.18, threePoint: 0.14, rebounding: 0.12, passing: 0.08, ballHandling: 0.09, steals: 0.06, blocks: 0.04, perimeterDefense: 0.12, postDefense: 0.07, athleticism: 0.10 },
  PF: { scoring: 0.15, threePoint: 0.07, rebounding: 0.22, passing: 0.05, ballHandling: 0.04, steals: 0.04, blocks: 0.12, perimeterDefense: 0.06, postDefense: 0.15, athleticism: 0.10 },
  C:  { scoring: 0.14, threePoint: 0.03, rebounding: 0.24, passing: 0.04, ballHandling: 0.02, steals: 0.03, blocks: 0.16, perimeterDefense: 0.04, postDefense: 0.21, athleticism: 0.09 },
};
const CLASS_ORDER = ["FR", "SO", "JR", "SR"];

/* =========================================================================
   REAL D1 PROGRAM SEED LIST  (names/conferences only — placeholder ratings;
   real rosters & box scores get wired in once a licensed data source is
   connected, see note in the Data tab)
   ========================================================================= */
const TEAMS = [
  { id: 'albany', name: 'Albany', abbr: 'ALBA', conf: 'America East', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'binghamton', name: 'Binghamton', abbr: 'BING', conf: 'America East', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'bryant', name: 'Bryant', abbr: 'BRYA', conf: 'America East', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'umaine', name: 'UMaine', abbr: 'UMAI', conf: 'America East', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'umbc', name: 'UMBC', abbr: 'UMBC', conf: 'America East', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'umass-lowell', name: 'UMass Lowell', abbr: 'UMAS', conf: 'America East', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'new-hampshire', name: 'New Hampshire', abbr: 'NEWH', conf: 'America East', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'new-jersey-institute-of-technology', name: 'New Jersey Institute of Technology', abbr: 'NEWJ', conf: 'America East', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'vermont', name: 'Vermont', abbr: 'VERM', conf: 'America East', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'charlotte', name: 'Charlotte', abbr: 'CHAR', conf: 'American', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'east-carolina', name: 'East Carolina', abbr: 'EAST', conf: 'American', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'fau', name: 'FAU', abbr: 'FAU', conf: 'American', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'memphis', name: 'Memphis', abbr: 'MEMP', conf: 'American', prestige: 4, primary: '#002855', secondary: '#eaaa00' },
  { id: 'north-texas', name: 'North Texas', abbr: 'NORT', conf: 'American', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'rice', name: 'Rice', abbr: 'RICE', conf: 'American', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'south-florida', name: 'South Florida', abbr: 'SOUT', conf: 'American', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'temple', name: 'Temple', abbr: 'TEMP', conf: 'American', prestige: 4, primary: '#003594', secondary: '#ffb81c' },
  { id: 'uab', name: 'UAB', abbr: 'UAB', conf: 'American', prestige: 3, primary: '#154734', secondary: '#ffb81c' },
  { id: 'utsa', name: 'UTSA', abbr: 'UTSA', conf: 'American', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'tulane', name: 'Tulane', abbr: 'TULA', conf: 'American', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'tulsa', name: 'Tulsa', abbr: 'TULS', conf: 'American', prestige: 3, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'wichita-state', name: 'Wichita State', abbr: 'WICH', conf: 'American', prestige: 3, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'boston', name: 'Boston College', abbr: 'BC', conf: 'ACC', prestige: 3, primary: '#003366', secondary: '#f1c400' },
  { id: 'california', name: 'California', abbr: 'CALI', conf: 'ACC', prestige: 4, primary: '#a6192e', secondary: '#000000' },
  { id: 'clemson', name: 'Clemson', abbr: 'CLEM', conf: 'ACC', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'duke', name: 'Duke', abbr: 'DUKE', conf: 'ACC', prestige: 5, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'florida-state', name: 'Florida State', abbr: 'FLOR', conf: 'ACC', prestige: 3, primary: '#c8102e', secondary: '#000000' },
  { id: 'georgia-tech', name: 'Georgia Tech', abbr: 'GEOR', conf: 'ACC', prestige: 3, primary: '#002855', secondary: '#eaaa00' },
  { id: 'louisville', name: 'Louisville', abbr: 'LOUI', conf: 'ACC', prestige: 5, primary: '#003087', secondary: '#898d8d' },
  { id: 'often-miami-fl', name: 'Miami (FL)', abbr: 'MIA', conf: 'ACC', prestige: 3, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'north-carolina', name: 'North Carolina', abbr: 'NORT', conf: 'ACC', prestige: 5, primary: '#8a1538', secondary: '#a99165' },
  { id: 'nc-state', name: 'NC State', abbr: 'NCST', conf: 'ACC', prestige: 4, primary: '#003594', secondary: '#ffb81c' },
  { id: 'notre-dame', name: 'Notre Dame', abbr: 'NOTR', conf: 'ACC', prestige: 4, primary: '#154734', secondary: '#ffb81c' },
  { id: 'pitt', name: 'Pitt', abbr: 'PITT', conf: 'ACC', prestige: 4, primary: '#9d2235', secondary: '#000000' },
  { id: 'smu', name: 'SMU', abbr: 'SMU', conf: 'ACC', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'stanford', name: 'Stanford', abbr: 'STAN', conf: 'ACC', prestige: 3, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'syracuse', name: 'Syracuse', abbr: 'SYRA', conf: 'ACC', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'virginia', name: 'Virginia', abbr: 'VIRG', conf: 'ACC', prestige: 4, primary: '#003366', secondary: '#f1c400' },
  { id: 'virginia-tech', name: 'Virginia Tech', abbr: 'VIRG', conf: 'ACC', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'wake-forest', name: 'Wake Forest', abbr: 'WAKE', conf: 'ACC', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'bellarmine', name: 'Bellarmine', abbr: 'BELL', conf: 'ASUN', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'florida-gulf-coast', name: 'Florida Gulf Coast', abbr: 'FLOR', conf: 'ASUN', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'jacksonville', name: 'Jacksonville', abbr: 'JACK', conf: 'ASUN', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'lipscomb', name: 'Lipscomb', abbr: 'LIPS', conf: 'ASUN', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'north-florida', name: 'North Florida', abbr: 'NORT', conf: 'ASUN', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'queens-university-of-charlotte', name: 'Queens University of Charlotte', abbr: 'QUEE', conf: 'ASUN', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'stetson', name: 'Stetson', abbr: 'STET', conf: 'ASUN', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'west-florida', name: 'West Florida', abbr: 'WEST', conf: 'ASUN', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'davidson', name: 'Davidson', abbr: 'DAVI', conf: 'Atlantic 10', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'dayton', name: 'Dayton', abbr: 'DAYT', conf: 'Atlantic 10', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'duquesne', name: 'Duquesne', abbr: 'DUQU', conf: 'Atlantic 10', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'fordham', name: 'Fordham', abbr: 'FORD', conf: 'Atlantic 10', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'george-mason', name: 'George Mason', abbr: 'GEOR', conf: 'Atlantic 10', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'george-washington', name: 'George Washington', abbr: 'GEOR', conf: 'Atlantic 10', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'la-salle', name: 'La Salle', abbr: 'LASA', conf: 'Atlantic 10', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'loyola-chicago', name: 'Loyola Chicago', abbr: 'LOYO', conf: 'Atlantic 10', prestige: 3, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'rhode-island', name: 'Rhode Island', abbr: 'RHOD', conf: 'Atlantic 10', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'richmond', name: 'Richmond', abbr: 'RICH', conf: 'Atlantic 10', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'st-bonaventure', name: 'St. Bonaventure', abbr: 'STBO', conf: 'Atlantic 10', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'saint-joe-s', name: "Saint Joe's", abbr: 'SAIN', conf: 'Atlantic 10', prestige: 3, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'saint-louis', name: 'Saint Louis', abbr: 'SAIN', conf: 'Atlantic 10', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'vcu', name: 'VCU', abbr: 'VCU', conf: 'Atlantic 10', prestige: 3, primary: '#003594', secondary: '#ffb81c' },
  { id: 'butler', name: 'Butler', abbr: 'BUTL', conf: 'Big East', prestige: 3, primary: '#154734', secondary: '#ffb81c' },
  { id: 'creighton', name: 'Creighton', abbr: 'CREI', conf: 'Big East', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'depaul', name: 'DePaul', abbr: 'DEPA', conf: 'Big East', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'georgetown', name: 'Georgetown', abbr: 'GEOR', conf: 'Big East', prestige: 4, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'marquette', name: 'Marquette', abbr: 'MARQ', conf: 'Big East', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'providence', name: 'Providence', abbr: 'PROV', conf: 'Big East', prestige: 3, primary: '#003366', secondary: '#f1c400' },
  { id: 'st-john-s', name: "St. John's", abbr: 'STJO', conf: 'Big East', prestige: 4, primary: '#a6192e', secondary: '#000000' },
  { id: 'seton-hall', name: 'Seton Hall', abbr: 'SETO', conf: 'Big East', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'uconn', name: 'UConn', abbr: 'UCON', conf: 'Big East', prestige: 5, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'villanova', name: 'Villanova', abbr: 'VILL', conf: 'Big East', prestige: 5, primary: '#c8102e', secondary: '#000000' },
  { id: 'xavier', name: 'Xavier', abbr: 'XAVI', conf: 'Big East', prestige: 4, primary: '#002855', secondary: '#eaaa00' },
  { id: 'eastern-washington', name: 'Eastern Washington', abbr: 'EAST', conf: 'Big Sky', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'idaho', name: 'Idaho', abbr: 'IDAH', conf: 'Big Sky', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'idaho-state', name: 'Idaho State', abbr: 'IDAH', conf: 'Big Sky', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'montana', name: 'Montana', abbr: 'MONT', conf: 'Big Sky', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'montana-state', name: 'Montana State', abbr: 'MONT', conf: 'Big Sky', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'northern-arizona', name: 'Northern Arizona', abbr: 'NORT', conf: 'Big Sky', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'northern-colorado', name: 'Northern Colorado', abbr: 'NORT', conf: 'Big Sky', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'portland-state', name: 'Portland State', abbr: 'PORT', conf: 'Big Sky', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'southern-utah', name: 'Southern Utah', abbr: 'SOUT', conf: 'Big Sky', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'utah-tech', name: 'Utah Tech', abbr: 'UTAH', conf: 'Big Sky', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'weber-state', name: 'Weber State', abbr: 'WEBE', conf: 'Big Sky', prestige: 3, primary: '#a6192e', secondary: '#000000' },
  { id: 'charleston-southern', name: 'Charleston Southern', abbr: 'CHAR', conf: 'Big South', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'gardner-webb', name: 'Gardner–Webb', abbr: 'GARD', conf: 'Big South', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'high-point', name: 'High Point', abbr: 'HIGH', conf: 'Big South', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'longwood', name: 'Longwood', abbr: 'LONG', conf: 'Big South', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'presbyterian', name: 'Presbyterian', abbr: 'PRES', conf: 'Big South', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'radford', name: 'Radford', abbr: 'RADF', conf: 'Big South', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'unc-asheville', name: 'UNC Asheville', abbr: 'UNCA', conf: 'Big South', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'usc-upstate', name: 'USC Upstate', abbr: 'USCU', conf: 'Big South', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'winthrop', name: 'Winthrop', abbr: 'WINT', conf: 'Big South', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'ucla', name: 'UCLA', abbr: 'UCLA', conf: 'Big Ten', prestige: 5, primary: '#9d2235', secondary: '#000000' },
  { id: 'illinois', name: 'Illinois', abbr: 'ILLI', conf: 'Big Ten', prestige: 4, primary: '#00205b', secondary: '#c41230' },
  { id: 'indiana', name: 'Indiana', abbr: 'INDI', conf: 'Big Ten', prestige: 5, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'iowa', name: 'Iowa', abbr: 'IOWA', conf: 'Big Ten', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'maryland', name: 'Maryland', abbr: 'MARY', conf: 'Big Ten', prestige: 4, primary: '#003366', secondary: '#f1c400' },
  { id: 'michigan', name: 'Michigan', abbr: 'MICH', conf: 'Big Ten', prestige: 5, primary: '#a6192e', secondary: '#000000' },
  { id: 'michigan-state', name: 'Michigan State', abbr: 'MICH', conf: 'Big Ten', prestige: 5, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'minnesota', name: 'Minnesota', abbr: 'MINN', conf: 'Big Ten', prestige: 3, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'nebraska', name: 'Nebraska', abbr: 'NEBR', conf: 'Big Ten', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'northwestern', name: 'Northwestern', abbr: 'NORT', conf: 'Big Ten', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'ohio-state', name: 'Ohio State', abbr: 'OHIO', conf: 'Big Ten', prestige: 5, primary: '#003087', secondary: '#898d8d' },
  { id: 'oregon', name: 'Oregon', abbr: 'OREG', conf: 'Big Ten', prestige: 4, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'penn-state', name: 'Penn State', abbr: 'PENN', conf: 'Big Ten', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'purdue', name: 'Purdue', abbr: 'PURD', conf: 'Big Ten', prestige: 4, primary: '#003594', secondary: '#ffb81c' },
  { id: 'rutgers', name: 'Rutgers', abbr: 'RUTG', conf: 'Big Ten', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'usc', name: 'USC', abbr: 'USC', conf: 'Big Ten', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'washington', name: 'Washington', abbr: 'WASH', conf: 'Big Ten', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'wisconsin', name: 'Wisconsin', abbr: 'WISC', conf: 'Big Ten', prestige: 4, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'arizona', name: 'Arizona', abbr: 'ARIZ', conf: 'Big 12', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'arizona-state', name: 'Arizona State', abbr: 'ARIZ', conf: 'Big 12', prestige: 3, primary: '#003366', secondary: '#f1c400' },
  { id: 'baylor', name: 'Baylor', abbr: 'BAYL', conf: 'Big 12', prestige: 4, primary: '#a6192e', secondary: '#000000' },
  { id: 'byu', name: 'BYU', abbr: 'BYU', conf: 'Big 12', prestige: 4, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'ucf', name: 'UCF', abbr: 'UCF', conf: 'Big 12', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'cincinnati', name: 'Cincinnati', abbr: 'CINC', conf: 'Big 12', prestige: 4, primary: '#c8102e', secondary: '#000000' },
  { id: 'colorado', name: 'Colorado', abbr: 'COLO', conf: 'Big 12', prestige: 3, primary: '#002855', secondary: '#eaaa00' },
  { id: 'houston', name: 'Houston', abbr: 'HOUS', conf: 'Big 12', prestige: 4, primary: '#003087', secondary: '#898d8d' },
  { id: 'iowa-state', name: 'Iowa State', abbr: 'IOWA', conf: 'Big 12', prestige: 3, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'kansas', name: 'Kansas', abbr: 'KANS', conf: 'Big 12', prestige: 5, primary: '#8a1538', secondary: '#a99165' },
  { id: 'kansas-state', name: 'Kansas State', abbr: 'KANS', conf: 'Big 12', prestige: 4, primary: '#003594', secondary: '#ffb81c' },
  { id: 'oklahoma-state', name: 'Oklahoma State', abbr: 'OKLA', conf: 'Big 12', prestige: 4, primary: '#154734', secondary: '#ffb81c' },
  { id: 'tcu', name: 'TCU', abbr: 'TCU', conf: 'Big 12', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'texas-tech', name: 'Texas Tech', abbr: 'TEXA', conf: 'Big 12', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'utah', name: 'Utah', abbr: 'UTAH', conf: 'Big 12', prestige: 4, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'west-virginia', name: 'West Virginia', abbr: 'WEST', conf: 'Big 12', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'california-baptist', name: 'California Baptist', abbr: 'CALI', conf: 'Big West', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'cal-poly', name: 'Cal Poly', abbr: 'CALP', conf: 'Big West', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'csu-bakersfield', name: 'CSU Bakersfield', abbr: 'CSUB', conf: 'Big West', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'cal-state-fullerton', name: 'Cal State Fullerton', abbr: 'CALS', conf: 'Big West', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'cal-state-northridge', name: 'Cal State Northridge', abbr: 'CALS', conf: 'Big West', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'long-beach-state', name: 'Long Beach State', abbr: 'LONG', conf: 'Big West', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'sacramento-state', name: 'Sacramento State', abbr: 'SACR', conf: 'Big West', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'uc-irvine', name: 'UC Irvine', abbr: 'UCIR', conf: 'Big West', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'uc-riverside', name: 'UC Riverside', abbr: 'UCRI', conf: 'Big West', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'uc-san-diego', name: 'UC San Diego', abbr: 'UCSA', conf: 'Big West', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'uc-santa-barbara', name: 'UC Santa Barbara', abbr: 'UCSA', conf: 'Big West', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'utah-valley', name: 'Utah Valley', abbr: 'UTAH', conf: 'Big West', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'campbell', name: 'Campbell', abbr: 'CAMP', conf: 'CAA', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'charleston', name: 'Charleston', abbr: 'CHAR', conf: 'CAA', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'drexel', name: 'Drexel', abbr: 'DREX', conf: 'CAA', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'elon', name: 'Elon', abbr: 'ELON', conf: 'CAA', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'hampton', name: 'Hampton', abbr: 'HAMP', conf: 'CAA', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'hofstra', name: 'Hofstra', abbr: 'HOFS', conf: 'CAA', prestige: 2, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'monmouth', name: 'Monmouth', abbr: 'MONM', conf: 'CAA', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'north-carolina-a-t', name: 'North Carolina A&T', abbr: 'NORT', conf: 'CAA', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'northeastern', name: 'Northeastern', abbr: 'NORT', conf: 'CAA', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'stony-brook', name: 'Stony Brook', abbr: 'STON', conf: 'CAA', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'towson', name: 'Towson', abbr: 'TOWS', conf: 'CAA', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'north-carolina-at-wilmington', name: 'UNC Wilmington', abbr: 'NORT', conf: 'CAA', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'college-of-william-mary', name: 'William & Mary', abbr: 'COLL', conf: 'CAA', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'delaware', name: 'Delaware', abbr: 'DELA', conf: 'Conference USA', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'fiu', name: 'FIU', abbr: 'FIU', conf: 'Conference USA', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'jacksonville-state', name: 'Jacksonville State', abbr: 'JACK', conf: 'Conference USA', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'kennesaw-state', name: 'Kennesaw State', abbr: 'KENN', conf: 'Conference USA', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'liberty', name: 'Liberty', abbr: 'LIBE', conf: 'Conference USA', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'middle-tennessee', name: 'Middle Tennessee', abbr: 'MIDD', conf: 'Conference USA', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'missouri-state', name: 'Missouri State', abbr: 'MISS', conf: 'Conference USA', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'new-mexico-state', name: 'New Mexico State', abbr: 'NEWM', conf: 'Conference USA', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'sam-houston', name: 'Sam Houston', abbr: 'SAMH', conf: 'Conference USA', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'western-kentucky', name: 'Western Kentucky', abbr: 'WEST', conf: 'Conference USA', prestige: 3, primary: '#c8102e', secondary: '#000000' },
  { id: 'cleveland-state', name: 'Cleveland State', abbr: 'CLEV', conf: 'Horizon', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'detroit-mercy', name: 'Detroit Mercy', abbr: 'DETR', conf: 'Horizon', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'iu-indy', name: 'IU Indy', abbr: 'IUIN', conf: 'Horizon', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'milwaukee', name: 'Milwaukee', abbr: 'MILW', conf: 'Horizon', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'northern-illinois', name: 'Northern Illinois', abbr: 'NORT', conf: 'Horizon', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'northern-kentucky', name: 'Northern Kentucky', abbr: 'NORT', conf: 'Horizon', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'oakland', name: 'Oakland', abbr: 'OAKL', conf: 'Horizon', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'purdue-fort-wayne', name: 'Purdue Fort Wayne', abbr: 'PURD', conf: 'Horizon', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'robert-morris', name: 'Robert Morris', abbr: 'ROBE', conf: 'Horizon', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'green-bay', name: 'Green Bay', abbr: 'GREE', conf: 'Horizon', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'wright-state', name: 'Wright State', abbr: 'WRIG', conf: 'Horizon', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'youngstown-state', name: 'Youngstown State', abbr: 'YOUN', conf: 'Horizon', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'brown', name: 'Brown', abbr: 'BROW', conf: 'Ivy', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'columbia', name: 'Columbia', abbr: 'COLU', conf: 'Ivy', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'cornell', name: 'Cornell', abbr: 'CORN', conf: 'Ivy', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'dartmouth', name: 'Dartmouth', abbr: 'DART', conf: 'Ivy', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'harvard', name: 'Harvard', abbr: 'HARV', conf: 'Ivy', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'penn', name: 'Penn', abbr: 'PENN', conf: 'Ivy', prestige: 3, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'princeton', name: 'Princeton', abbr: 'PRIN', conf: 'Ivy', prestige: 3, primary: '#8a1538', secondary: '#a99165' },
  { id: 'yale', name: 'Yale', abbr: 'YALE', conf: 'Ivy', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'canisius', name: 'Canisius', abbr: 'CANI', conf: 'MAAC', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'fairfield', name: 'Fairfield', abbr: 'FAIR', conf: 'MAAC', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'iona', name: 'Iona', abbr: 'IONA', conf: 'MAAC', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'manhattan', name: 'Manhattan', abbr: 'MANH', conf: 'MAAC', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'marist', name: 'Marist', abbr: 'MARI', conf: 'MAAC', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'merrimack', name: 'Merrimack', abbr: 'MERR', conf: 'MAAC', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'mount-st-mary-s', name: "Mount St. Mary's", abbr: 'MOUN', conf: 'MAAC', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'niagara', name: 'Niagara', abbr: 'NIAG', conf: 'MAAC', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'quinnipiac', name: 'Quinnipiac', abbr: 'QUIN', conf: 'MAAC', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'rider', name: 'Rider', abbr: 'RIDE', conf: 'MAAC', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'sacred-heart', name: 'Sacred Heart', abbr: 'SACR', conf: 'MAAC', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'saint-peter-s', name: "Saint Peter's", abbr: 'SAIN', conf: 'MAAC', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'siena', name: 'Siena', abbr: 'SIEN', conf: 'MAAC', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'akron', name: 'Akron', abbr: 'AKRO', conf: 'MAC', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'ball-state', name: 'Ball State', abbr: 'BALL', conf: 'MAC', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'bowling-green', name: 'Bowling Green', abbr: 'BOWL', conf: 'MAC', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'university-at-buffalo', name: 'Buffalo', abbr: 'UNIV', conf: 'MAC', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'central-michigan', name: 'Central Michigan', abbr: 'CENT', conf: 'MAC', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'eastern-michigan', name: 'Eastern Michigan', abbr: 'EAST', conf: 'MAC', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'kent-state', name: 'Kent State', abbr: 'KENT', conf: 'MAC', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'umass', name: 'UMass', abbr: 'UMAS', conf: 'MAC', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'miami-oh', name: 'Miami (OH)', abbr: 'MOH', conf: 'MAC', prestige: 3, primary: '#a6192e', secondary: '#000000' },
  { id: 'ohio', name: 'Ohio', abbr: 'OHIO', conf: 'MAC', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'toledo', name: 'Toledo', abbr: 'TOLE', conf: 'MAC', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'western-michigan', name: 'Western Michigan', abbr: 'WEST', conf: 'MAC', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'coppin-state', name: 'Coppin State', abbr: 'COPP', conf: 'MEAC', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'delaware-state', name: 'Delaware State', abbr: 'DELA', conf: 'MEAC', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'howard', name: 'Howard', abbr: 'HOWA', conf: 'MEAC', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'maryland-eastern-shore', name: 'Maryland Eastern Shore', abbr: 'MARY', conf: 'MEAC', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'morgan-state', name: 'Morgan State', abbr: 'MORG', conf: 'MEAC', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'norfolk-state', name: 'Norfolk State', abbr: 'NORF', conf: 'MEAC', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'north-carolina-central', name: 'North Carolina Central', abbr: 'NORT', conf: 'MEAC', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'sc-state', name: 'SC State', abbr: 'SCST', conf: 'MEAC', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'belmont', name: 'Belmont', abbr: 'BELM', conf: 'Missouri Valley', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'bradley', name: 'Bradley', abbr: 'BRAD', conf: 'Missouri Valley', prestige: 3, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'drake', name: 'Drake', abbr: 'DRAK', conf: 'Missouri Valley', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'evansville', name: 'Evansville', abbr: 'EVAN', conf: 'Missouri Valley', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'illinois-state', name: 'Illinois State', abbr: 'ILLI', conf: 'Missouri Valley', prestige: 2, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'indiana-state', name: 'Indiana State', abbr: 'INDI', conf: 'Missouri Valley', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'murray-state', name: 'Murray State', abbr: 'MURR', conf: 'Missouri Valley', prestige: 3, primary: '#c8102e', secondary: '#000000' },
  { id: 'northern-iowa', name: 'Northern Iowa', abbr: 'NORT', conf: 'Missouri Valley', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'southern-illinois', name: 'Southern Illinois', abbr: 'SOUT', conf: 'Missouri Valley', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'uic', name: 'UIC', abbr: 'UIC', conf: 'Missouri Valley', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'valpo', name: 'Valpo', abbr: 'VALP', conf: 'Missouri Valley', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'air-force', name: 'Air Force', abbr: 'AIRF', conf: 'Mountain West', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'grand-canyon', name: 'Grand Canyon', abbr: 'GRAN', conf: 'Mountain West', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'hawaii', name: 'Hawaii', abbr: 'HAWA', conf: 'Mountain West', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'nevada', name: 'Nevada', abbr: 'NEVA', conf: 'Mountain West', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'new-mexico', name: 'New Mexico', abbr: 'NEWM', conf: 'Mountain West', prestige: 3, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'san-jose-state', name: 'San Jose State', abbr: 'SANJ', conf: 'Mountain West', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'uc-davis', name: 'UC Davis', abbr: 'UCDA', conf: 'Mountain West', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'unlv', name: 'UNLV', abbr: 'UNLV', conf: 'Mountain West', prestige: 4, primary: '#a6192e', secondary: '#000000' },
  { id: 'utep', name: 'UTEP', abbr: 'UTEP', conf: 'Mountain West', prestige: 3, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'wyoming', name: 'Wyoming', abbr: 'WYOM', conf: 'Mountain West', prestige: 3, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'central-connecticut', name: 'Central Connecticut', abbr: 'CENT', conf: 'NEC', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'chicago-state', name: 'Chicago State', abbr: 'CHIC', conf: 'NEC', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'fairleigh-dickinson', name: 'Fairleigh Dickinson', abbr: 'FAIR', conf: 'NEC', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'le-moyne', name: 'Le Moyne', abbr: 'LEMO', conf: 'NEC', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'long-island', name: 'Long Island', abbr: 'LONG', conf: 'NEC', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'mercyhurst', name: 'Mercyhurst', abbr: 'MERC', conf: 'NEC', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'new-haven', name: 'New Haven', abbr: 'NEWH', conf: 'NEC', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'stonehill', name: 'Stonehill', abbr: 'STON', conf: 'NEC', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'wagner', name: 'Wagner', abbr: 'WAGN', conf: 'NEC', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'eastern-illinois', name: 'Eastern Illinois', abbr: 'EAST', conf: 'Ohio Valley', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'lindenwood', name: 'Lindenwood', abbr: 'LIND', conf: 'Ohio Valley', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'morehead-state', name: 'Morehead State', abbr: 'MORE', conf: 'Ohio Valley', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'southeast-missouri', name: 'Southeast Missouri', abbr: 'SOUT', conf: 'Ohio Valley', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'siu-edwardsville', name: 'SIU Edwardsville', abbr: 'SIUE', conf: 'Ohio Valley', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'southern-indiana', name: 'Southern Indiana', abbr: 'SOUT', conf: 'Ohio Valley', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'ut-martin', name: 'UT Martin', abbr: 'UTMA', conf: 'Ohio Valley', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'tennessee-state', name: 'Tennessee State', abbr: 'TENN', conf: 'Ohio Valley', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'western-illinois', name: 'Western Illinois', abbr: 'WEST', conf: 'Ohio Valley', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'boise-state', name: 'Boise State', abbr: 'BOIS', conf: 'Pac-12', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'colorado-state', name: 'Colorado State', abbr: 'COLO', conf: 'Pac-12', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'fresno-state', name: 'Fresno State', abbr: 'FRES', conf: 'Pac-12', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'gonzaga', name: 'Gonzaga', abbr: 'GONZ', conf: 'Pac-12', prestige: 4, primary: '#154734', secondary: '#ffb81c' },
  { id: 'oregon-state', name: 'Oregon State', abbr: 'OREG', conf: 'Pac-12', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'san-diego-state', name: 'San Diego State', abbr: 'SAND', conf: 'Pac-12', prestige: 3, primary: '#00205b', secondary: '#c41230' },
  { id: 'texas-state', name: 'Texas State', abbr: 'TEXA', conf: 'Pac-12', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'utah-state', name: 'Utah State', abbr: 'UTAH', conf: 'Pac-12', prestige: 3, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'washington-state', name: 'Washington State', abbr: 'WASH', conf: 'Pac-12', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'american', name: 'American', abbr: 'AMER', conf: 'Patriot', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'army', name: 'Army', abbr: 'ARMY', conf: 'Patriot', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'boston-2', name: 'Boston University', abbr: 'BU', conf: 'Patriot', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'bucknell', name: 'Bucknell', abbr: 'BUCK', conf: 'Patriot', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'colgate', name: 'Colgate', abbr: 'COLG', conf: 'Patriot', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'college-of-the-holy-cross', name: 'Holy Cross', abbr: 'COLL', conf: 'Patriot', prestige: 3, primary: '#003087', secondary: '#898d8d' },
  { id: 'lafayette', name: 'Lafayette', abbr: 'LAFA', conf: 'Patriot', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'lehigh', name: 'Lehigh', abbr: 'LEHI', conf: 'Patriot', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'loyola-maryland', name: 'Loyola Maryland', abbr: 'LOYO', conf: 'Patriot', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'navy', name: 'Navy', abbr: 'NAVY', conf: 'Patriot', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'alabama', name: 'Alabama', abbr: 'ALAB', conf: 'SEC', prestige: 4, primary: '#9d2235', secondary: '#000000' },
  { id: 'arkansas', name: 'Arkansas', abbr: 'ARKA', conf: 'SEC', prestige: 4, primary: '#00205b', secondary: '#c41230' },
  { id: 'auburn', name: 'Auburn', abbr: 'AUBU', conf: 'SEC', prestige: 3, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'florida', name: 'Florida', abbr: 'FLOR', conf: 'SEC', prestige: 4, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'georgia', name: 'Georgia', abbr: 'GEOR', conf: 'SEC', prestige: 3, primary: '#003366', secondary: '#f1c400' },
  { id: 'kentucky', name: 'Kentucky', abbr: 'KENT', conf: 'SEC', prestige: 5, primary: '#a6192e', secondary: '#000000' },
  { id: 'lsu', name: 'LSU', abbr: 'LSU', conf: 'SEC', prestige: 4, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'ole-miss', name: 'Ole Miss', abbr: 'OLEM', conf: 'SEC', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'mississippi-state', name: 'Mississippi State', abbr: 'MISS', conf: 'SEC', prestige: 3, primary: '#c8102e', secondary: '#000000' },
  { id: 'mizzou', name: 'Mizzou', abbr: 'MIZZ', conf: 'SEC', prestige: 4, primary: '#002855', secondary: '#eaaa00' },
  { id: 'oklahoma', name: 'Oklahoma', abbr: 'OKLA', conf: 'SEC', prestige: 4, primary: '#003087', secondary: '#898d8d' },
  { id: 'south-carolina', name: 'South Carolina', abbr: 'SOUT', conf: 'SEC', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'tennessee', name: 'Tennessee', abbr: 'TENN', conf: 'SEC', prestige: 3, primary: '#8a1538', secondary: '#a99165' },
  { id: 'texas', name: 'Texas', abbr: 'TEXA', conf: 'SEC', prestige: 4, primary: '#003594', secondary: '#ffb81c' },
  { id: 'texas-a-m', name: 'Texas A&M', abbr: 'TEXA', conf: 'SEC', prestige: 3, primary: '#154734', secondary: '#ffb81c' },
  { id: 'vandy', name: 'Vandy', abbr: 'VAND', conf: 'SEC', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'chattanooga', name: 'Chattanooga', abbr: 'CHAT', conf: 'Southern', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'citadel', name: 'Citadel', abbr: 'CITA', conf: 'Southern', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'east-tennessee-state', name: 'East Tennessee State', abbr: 'EAST', conf: 'Southern', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'furman', name: 'Furman', abbr: 'FURM', conf: 'Southern', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'mercer', name: 'Mercer', abbr: 'MERC', conf: 'Southern', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'samford', name: 'Samford', abbr: 'SAMF', conf: 'Southern', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'tennessee-tech', name: 'Tennessee Tech', abbr: 'TENN', conf: 'Southern', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'north-carolina-at-greensboro', name: 'UNC Greensboro', abbr: 'NORT', conf: 'Southern', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'virginia-military-institute', name: 'Virginia Military Institute', abbr: 'VIRG', conf: 'Southern', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'western-carolina', name: 'Western Carolina', abbr: 'WEST', conf: 'Southern', prestige: 1, primary: '#003087', secondary: '#898d8d' },
  { id: 'wofford', name: 'Wofford', abbr: 'WOFF', conf: 'Southern', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'east-texas-a-m', name: 'East Texas A&M', abbr: 'EAST', conf: 'Southland', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'houston-christian', name: 'Houston Christian', abbr: 'HOUS', conf: 'Southland', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'incarnate-word', name: 'Incarnate Word', abbr: 'INCA', conf: 'Southland', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'lamar', name: 'Lamar', abbr: 'LAMA', conf: 'Southland', prestige: 2, primary: '#9d2235', secondary: '#000000' },
  { id: 'lsu-new-orleans', name: 'LSU New Orleans', abbr: 'LSUN', conf: 'Southland', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'mcneese', name: 'McNeese', abbr: 'MCNE', conf: 'Southland', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'nicholls', name: 'Nicholls', abbr: 'NICH', conf: 'Southland', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'northwestern-state', name: 'Northwestern State', abbr: 'NORT', conf: 'Southland', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'southeastern-louisiana', name: 'Southeastern Louisiana', abbr: 'SOUT', conf: 'Southland', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'stephen-f-austin', name: 'Stephen F. Austin', abbr: 'STEP', conf: 'Southland', prestige: 2, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'texas-a-m-university-corpus-christi', name: 'Texas A&M University-Corpus Christi', abbr: 'TEXA', conf: 'Southland', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'texas-rio-grande-valley', name: 'UT Rio Grande Valley', abbr: 'TEXA', conf: 'Southland', prestige: 1, primary: '#c8102e', secondary: '#000000' },
  { id: 'alabama-a-m', name: 'Alabama A&M', abbr: 'ALAB', conf: 'SWAC', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'alabama-state', name: 'Alabama State', abbr: 'ALAB', conf: 'SWAC', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'alcorn-state', name: 'Alcorn State', abbr: 'ALCO', conf: 'SWAC', prestige: 2, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'arkansas-pine-bluff', name: 'Arkansas–Pine Bluff', abbr: 'ARKA', conf: 'SWAC', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'bethune-cookman', name: 'Bethune–Cookman', abbr: 'BETH', conf: 'SWAC', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'florida-a-m', name: 'Florida A&M', abbr: 'FLOR', conf: 'SWAC', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'grambling-state', name: 'Grambling State', abbr: 'GRAM', conf: 'SWAC', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'jackson-state', name: 'Jackson State', abbr: 'JACK', conf: 'SWAC', prestige: 1, primary: '#00205b', secondary: '#c41230' },
  { id: 'mississippi-valley-state', name: 'Mississippi Valley State', abbr: 'MISS', conf: 'SWAC', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'prairie-view-a-m', name: 'Prairie View A&M', abbr: 'PRAI', conf: 'SWAC', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'southern', name: 'Southern', abbr: 'SOUT', conf: 'SWAC', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'texas-southern', name: 'Texas Southern', abbr: 'TEXA', conf: 'SWAC', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'kansas-city', name: 'Kansas City', abbr: 'KANS', conf: 'Summit', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'north-dakota', name: 'North Dakota', abbr: 'NORT', conf: 'Summit', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'north-dakota-state', name: 'North Dakota State', abbr: 'NORT', conf: 'Summit', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'omaha', name: 'Omaha', abbr: 'OMAH', conf: 'Summit', prestige: 1, primary: '#002855', secondary: '#eaaa00' },
  { id: 'oral-roberts', name: 'Oral Roberts', abbr: 'ORAL', conf: 'Summit', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'st-thomas', name: 'St. Thomas', abbr: 'STTH', conf: 'Summit', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'south-dakota', name: 'South Dakota', abbr: 'SOUT', conf: 'Summit', prestige: 1, primary: '#8a1538', secondary: '#a99165' },
  { id: 'south-dakota-state', name: 'South Dakota State', abbr: 'SOUT', conf: 'Summit', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'appalachian-state', name: 'Appalachian State', abbr: 'APPA', conf: 'Sun Belt', prestige: 1, primary: '#154734', secondary: '#ffb81c' },
  { id: 'arkansas-state', name: 'Arkansas State', abbr: 'ARKA', conf: 'Sun Belt', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'coastal-carolina', name: 'Coastal Carolina', abbr: 'COAS', conf: 'Sun Belt', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'georgia-southern', name: 'Georgia Southern', abbr: 'GEOR', conf: 'Sun Belt', prestige: 1, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'georgia-state', name: 'Georgia State', abbr: 'GEOR', conf: 'Sun Belt', prestige: 2, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'james-madison', name: 'James Madison', abbr: 'JAME', conf: 'Sun Belt', prestige: 2, primary: '#003366', secondary: '#f1c400' },
  { id: 'louisiana', name: 'Louisiana', abbr: 'LOUI', conf: 'Sun Belt', prestige: 2, primary: '#a6192e', secondary: '#000000' },
  { id: 'louisiana-monroe', name: 'Louisiana–Monroe', abbr: 'LOUI', conf: 'Sun Belt', prestige: 2, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'alternately-la-tech', name: 'Louisiana Tech', abbr: 'LT', conf: 'Sun Belt', prestige: 2, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'marshall', name: 'Marshall', abbr: 'MARS', conf: 'Sun Belt', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'old-dominion', name: 'Old Dominion', abbr: 'OLDD', conf: 'Sun Belt', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'south-alabama', name: 'South Alabama', abbr: 'SOUT', conf: 'Sun Belt', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'southern-miss', name: 'Southern Miss', abbr: 'SOUT', conf: 'Sun Belt', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'troy', name: 'Troy', abbr: 'TROY', conf: 'Sun Belt', prestige: 2, primary: '#8a1538', secondary: '#a99165' },
  { id: 'abilene-christian', name: 'Abilene Christian', abbr: 'ABIL', conf: 'UAC', prestige: 1, primary: '#003594', secondary: '#ffb81c' },
  { id: 'austin-peay', name: 'Austin Peay', abbr: 'AUST', conf: 'UAC', prestige: 2, primary: '#154734', secondary: '#ffb81c' },
  { id: 'central-arkansas', name: 'Central Arkansas', abbr: 'CENT', conf: 'UAC', prestige: 1, primary: '#9d2235', secondary: '#000000' },
  { id: 'eastern-kentucky', name: 'Eastern Kentucky', abbr: 'EAST', conf: 'UAC', prestige: 2, primary: '#00205b', secondary: '#c41230' },
  { id: 'little-rock', name: 'Little Rock', abbr: 'LITT', conf: 'UAC', prestige: 2, primary: '#461d7c', secondary: '#fdd023' },
  { id: 'north-alabama', name: 'North Alabama', abbr: 'NORT', conf: 'UAC', prestige: 1, primary: '#005ca9', secondary: '#ffffff' },
  { id: 'alternately-tarleton', name: 'Tarleton State', abbr: 'TAR', conf: 'UAC', prestige: 1, primary: '#003366', secondary: '#f1c400' },
  { id: 'ut-arlington', name: 'UT Arlington', abbr: 'UTAR', conf: 'UAC', prestige: 1, primary: '#a6192e', secondary: '#000000' },
  { id: 'west-georgia', name: 'West Georgia', abbr: 'WEST', conf: 'UAC', prestige: 1, primary: '#0c2340', secondary: '#9ea2a2' },
  { id: 'denver', name: 'Denver', abbr: 'DENV', conf: 'WCC', prestige: 1, primary: '#00274c', secondary: '#ffcb05' },
  { id: 'loyola-marymount', name: 'Loyola Marymount', abbr: 'LOYO', conf: 'WCC', prestige: 2, primary: '#c8102e', secondary: '#000000' },
  { id: 'pacific', name: 'Pacific', abbr: 'PACI', conf: 'WCC', prestige: 2, primary: '#002855', secondary: '#eaaa00' },
  { id: 'pepperdine', name: 'Pepperdine', abbr: 'PEPP', conf: 'WCC', prestige: 2, primary: '#003087', secondary: '#898d8d' },
  { id: 'portland', name: 'Portland', abbr: 'PORT', conf: 'WCC', prestige: 1, primary: '#232d4b', secondary: '#f84c1e' },
  { id: 'saint-mary-s', name: "Saint Mary's", abbr: 'SAIN', conf: 'WCC', prestige: 3, primary: '#8a1538', secondary: '#a99165' },
  { id: 'san-diego', name: 'San Diego', abbr: 'SAND', conf: 'WCC', prestige: 2, primary: '#003594', secondary: '#ffb81c' },
  { id: 'san-francisco', name: 'San Francisco', abbr: 'SANF', conf: 'WCC', prestige: 4, primary: '#154734', secondary: '#ffb81c' },
  { id: 'santa-clara', name: 'Santa Clara', abbr: 'SANT', conf: 'WCC', prestige: 3, primary: '#9d2235', secondary: '#000000' },
  { id: 'seattle', name: 'Seattle', abbr: 'SEAT', conf: 'WCC', prestige: 3, primary: '#00205b', secondary: '#c41230' },
];
const TEAM_MAP = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

// Campus coordinates (city-level) for every program, keyed by team id. Used to
// price recruiting visits by how far a prospect's hometown is from campus.
const TEAM_LOCATIONS = teamLocationsRaw;

/* =========================================================================
   REAL DATA (Bart Torvik) — wired in from scripts/import-torvik.mjs and
   scripts/import-torvik-players.mjs. Both files default to {} until you
   run those scripts, so the app works identically either way.

   Torvik's team-name strings don't always match ours 1:1 (e.g. it may say
   "Connecticut" where our list says "UConn"). TORVIK_TEAM_ALIASES covers
   the mismatches I'm confident about. Matching is EXACT-ONLY (name or
   alias, normalized) — no fuzzy "contains" guessing, because that caused
   real wrong-team mixups (e.g. "Ohio" matching "Ohio State" rows). If a
   team isn't showing real data, check the browser console: unmatched
   teams are logged there once per session, which is the list to extend
   this alias map with once we know the real API's naming convention.
   ========================================================================= */
const torvikSeasons = torvikSeasonsRaw || {};
const torvikPlayers = torvikPlayersRaw || {};

// Every season we have real player data for, ascending. Torvik keys each
// season by its ENDING calendar year (key "2009" == the 2008–09 season),
// which is also the convention our internal `year` uses.
const AVAILABLE_YEARS = Object.keys(torvikPlayers)
  .map(Number)
  .filter((n) => !Number.isNaN(n))
  .sort((a, b) => a - b);
const FIRST_YEAR = AVAILABLE_YEARS[0] ?? 2008;
const LAST_YEAR = AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1] ?? 2026;

// Season display label. Internal `year` is the season's ENDING year, so
// year 2009 renders as "2008–09". Keeps the UI consistent with how college
// basketball seasons are actually named.
function seasonLabel(year) {
  return `${year - 1}–${String(year).slice(2)}`;
}

// The imported ppg/rpg/apg fields are SEASON TOTALS, not per-game averages.
// Everything that reasons about production must divide by games played.
function perGame(total, gp) {
  const g = gp || 0;
  if (g <= 0) return 0;
  return (total ?? 0) / g;
}

// Small-sample guard: a player with a handful of games shouldn't be rated
// off a fluky per-game line. Full credit at ~10+ games, damped below that,
// never below half.
function sampleReliability(gp) {
  return clamp((gp || 0) / 10, 0.5, 1);
}

// Evidence from a real data pull: CBBD keeps well-known acronyms as-is
// (its data literally has a team named "BYU", not "Brigham Young") — so
// the old aliases redirecting BYU/SMU/TCU/UCF/USC/UIC to expanded names
// were backwards and actively broke matches that worked fine unaliased.
// Removed those; keeping only the ones that plausibly ARE genuine
// nickname-to-formal-name gaps (still unverified — extend/correct this
// once you've run the diagnostic script and shared results).
// Built from a real diagnostic run (321/365 matched exactly on the first
// pass; these cover the confirmed misses). Evidence showed CBBD keeps
// well-known acronyms/nicknames as literal team names rather than
// expanding them (e.g. real data has "BYU" and "UConn" and "Ole Miss"
// verbatim) -- so this table only holds genuine gaps, not guesses.
// A few teams (Albany/UAlbany, West Florida, New Haven, St. Thomas (MN),
// Louisiana-Monroe, West Georgia) didn't have a confident match and are
// left unresolved rather than guessed wrong -- they'll just show
// generated players until confirmed.
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

const _unmatchedLogged = new Set();

// Strict, exact-normalized-name match only — see note above on why the
// old "contains" fallback was removed.
function findByExactTeamName(teamName, rows, getTeamField) {
  if (!rows || !rows.length) return null;
  const alias = TORVIK_TEAM_ALIASES[teamName];
  const target = normalizeTeamKey(alias || teamName);
  const hit = rows.find((r) => normalizeTeamKey(getTeamField(r)) === target);
  if (!hit && !_unmatchedLogged.has(teamName)) {
    _unmatchedLogged.add(teamName);
    console.warn(`[real data] no exact match for "${teamName}" (tried "${alias || teamName}") — add an alias in TORVIK_TEAM_ALIASES if this team has real data under a different name.`);
  }
  return hit || null;
}

// Real historical team record/efficiency for a given team+year, or null.
function realSeasonFor(team, year) {
  const rows = torvikSeasons[String(year)];
  if (!rows) return null;
  return findByExactTeamName(team.name, rows, (r) => r.team);
}

// Real roster rows {player, position, startSeason, ppg, rpg, apg} for a
// team+year, or [] if we don't have that year or can't exact-match the team.
function realPlayersFor(team, year) {
  const rows = torvikPlayers[String(year)];
  if (!rows || !rows.length) return [];
  const alias = TORVIK_TEAM_ALIASES[team.name];
  const target = normalizeTeamKey(alias || team.name);
  const matched = rows.filter((r) => normalizeTeamKey(r.team) === target);
  if (!matched.length && !_unmatchedLogged.has(team.name)) {
    _unmatchedLogged.add(team.name);
    console.warn(`[real data] no exact roster match for "${team.name}" (tried "${alias || team.name}") in ${year}.`);
  }
  return matched.filter(isPlausibleRosterRow);
}

/* -------------------------------------------------------------------------
   CAREER INDEX
   The source data's `startSeason` is really "first season at the CURRENT
   team", so it RESETS when a player transfers (P.J. Haggerty reads 2023 at
   TCU, 2024 at Tulsa, 2026 at Kansas State). To recover a player's true class
   and career arc, index every season a name appears and treat the earliest as
   their real career start. Identity is by name only — a pragmatic heuristic,
   since the dataset carries no stable per-player id.
   ------------------------------------------------------------------------- */
const CAREER_INDEX = (() => {
  const idx = {};
  for (const y of Object.keys(torvikPlayers)) {
    for (const r of torvikPlayers[y] || []) {
      if (!r || !r.player) continue;
      (idx[r.player] || (idx[r.player] = [])).push(r);
    }
  }
  for (const name in idx) idx[name].sort((a, b) => a.year - b.year);
  return idx;
})();

function careerStartYear(name, fallback) {
  const c = CAREER_INDEX[name];
  if (!c || !c.length) return fallback ?? null;
  // Each row's `startSeason` is the player's first season at THAT team, so it
  // resets on transfer — but the MINIMUM across all their rows is their true
  // career origin. Crucially, startSeason can predate the dataset's earliest
  // year (e.g. DeMarcus Nelson reads startSeason 2005 in a 2008 row), so it
  // recovers the correct class for players whose careers began before 2008,
  // which the earliest-appearance heuristic alone gets wrong (labeling them FR).
  let start = null;
  for (const r of c) {
    const s = typeof r.startSeason === "number" ? r.startSeason : r.year;
    if (start == null || s < start) start = s;
  }
  return start ?? fallback ?? null;
}

// Class label from true career start, capped at senior. Fifth-year+ players
// (redshirts, or name collisions) read SR rather than overflowing the array.
function realClassForName(name, year, fallbackStart) {
  const start = careerStartYear(name, fallbackStart);
  if (start == null) return null;
  return ["FR", "SO", "JR", "SR"][clamp(year - start, 0, 3)];
}

// A newcomer to a team this `year` who already appeared in an earlier season
// is a transfer, not a true freshman.
function isTransferName(name, year) {
  const c = CAREER_INDEX[name];
  return !!(c && c.some((r) => r.year < year));
}

// A player's actual real stat row for a specific season, or null.
function realStatRowForName(name, year) {
  const c = CAREER_INDEX[name];
  if (!c) return null;
  return c.find((r) => r.year === year) || null;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =========================================================================
   NAME POOLS + RNG HELPERS
   ========================================================================= */
const FIRST_NAMES = ["Marcus","DeShawn","Tyler","Jalen","Caleb","Isaiah","Xavier","Dominic","Elijah","Malik",
  "Trey","Cameron","Jordan","Andre","Brandon","Kevin","Devin","Terrence","Antonio","Miles",
  "Aaron","Chase","Damon","Ezra","Grant","Hunter","Jamal","Keon","Leon","Nate",
  "Omar","Quentin","Reggie","Shane","Tobias","Wesley","Zach","Corey","Darius","Emmanuel"];
const LAST_NAMES = ["Carter","Brooks","Hendrix","Washington","Coleman","Mercer","Whitfield","Sanders","Holloway","Pruitt",
  "Sterling","Dawkins","Ferrell","Langston","Boyd","Rucker","Tatum","Lacey","Maddox","Osei",
  "Delgado","Pruett","Kessler","Vance","Whitaker","Odom","Barrow","Nash","Quinn","Reyes",
  "Sharp","Underwood","Vega","Wooten","Blackmon","Cravens","Doss","Ellington","Gantt","Hobbs"];
const STATES = ["CA","TX","FL","NY","IL","GA","NC","OH","PA","MI","NJ","VA","IN","TN","MD","AZ","MO","WI","LA","AL"];

// The 50 states + DC. A recruit whose hometown `state` is NOT in this set is
// treated as international (the source stores a country/region name there).
const US_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

// Rough geographic centroid of each state, used as a fallback when a domestic
// recruit's row has no precise hometown coordinates.
const STATE_CENTROIDS = {
  AL: { lat: 32.8, lng: -86.8 }, AK: { lat: 64.2, lng: -149.5 }, AZ: { lat: 34.3, lng: -111.7 },
  AR: { lat: 34.9, lng: -92.4 }, CA: { lat: 37.2, lng: -119.5 }, CO: { lat: 39.0, lng: -105.5 },
  CT: { lat: 41.6, lng: -72.7 }, DE: { lat: 39.0, lng: -75.5 }, FL: { lat: 28.6, lng: -82.4 },
  GA: { lat: 32.6, lng: -83.4 }, HI: { lat: 20.3, lng: -156.4 }, ID: { lat: 44.4, lng: -114.6 },
  IL: { lat: 40.0, lng: -89.2 }, IN: { lat: 39.9, lng: -86.3 }, IA: { lat: 42.0, lng: -93.5 },
  KS: { lat: 38.5, lng: -98.4 }, KY: { lat: 37.5, lng: -85.3 }, LA: { lat: 31.0, lng: -92.0 },
  ME: { lat: 45.4, lng: -69.2 }, MD: { lat: 39.0, lng: -76.8 }, MA: { lat: 42.3, lng: -71.8 },
  MI: { lat: 44.3, lng: -85.4 }, MN: { lat: 46.3, lng: -94.3 }, MS: { lat: 32.7, lng: -89.7 },
  MO: { lat: 38.4, lng: -92.5 }, MT: { lat: 47.0, lng: -109.6 }, NE: { lat: 41.5, lng: -99.8 },
  NV: { lat: 39.3, lng: -116.6 }, NH: { lat: 43.7, lng: -71.6 }, NJ: { lat: 40.1, lng: -74.7 },
  NM: { lat: 34.4, lng: -106.1 }, NY: { lat: 42.9, lng: -75.5 }, NC: { lat: 35.6, lng: -79.4 },
  ND: { lat: 47.5, lng: -100.5 }, OH: { lat: 40.3, lng: -82.8 }, OK: { lat: 35.6, lng: -97.5 },
  OR: { lat: 44.0, lng: -120.5 }, PA: { lat: 40.9, lng: -77.8 }, RI: { lat: 41.7, lng: -71.6 },
  SC: { lat: 33.9, lng: -80.9 }, SD: { lat: 44.4, lng: -100.2 }, TN: { lat: 35.9, lng: -86.4 },
  TX: { lat: 31.5, lng: -99.3 }, UT: { lat: 39.3, lng: -111.7 }, VT: { lat: 44.1, lng: -72.7 },
  VA: { lat: 37.5, lng: -78.9 }, WA: { lat: 47.4, lng: -120.5 }, WV: { lat: 38.6, lng: -80.6 },
  WI: { lat: 44.6, lng: -89.9 }, WY: { lat: 43.0, lng: -107.5 }, DC: { lat: 38.9, lng: -77.0 },
};

// Great-circle distance in miles between two {lat,lng} points (Haversine).
function haversineMiles(a, b) {
  if (!a || !b || a.lat == null || b.lat == null || a.lng == null || b.lng == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }

/* =========================================================================
   PLAYER / ATTRIBUTE GENERATION
   ========================================================================= */
// A player's best full-ish season scoring average across their whole career,
// ignoring strength of competition. Lets genuine outliers at small programs
// (the Damian Lillard-at-Weber-State case) earn credit their single-season
// line plus the competition penalty would otherwise bury.
function careerScoringPeak(name) {
  const c = name ? CAREER_INDEX[name] : null;
  if (!c) return 0;
  let peak = 0;
  for (const r of c) {
    if ((Number(r.gp) || 0) < 5) continue;
    const pg = perGame(r.ppg, r.gp);
    if (pg > peak) peak = pg;
  }
  return peak;
}
function careerOutlierBonus(name) {
  const peak = careerScoringPeak(name);
  if (peak >= 24) return 12;
  if (peak >= 20) return 8;
  if (peak >= 17) return 5;
  if (peak >= 14) return 2;
  return 0;
}

// Overall lives on a strict 40-99 scale (see genAttrs* — every attribute is
// floored at 40), so the minutes-weighted team overalls and sim math all sit
// on the same band.
// Raw positional weighting graded genuine contributors too low (a 19/5/3 lead
// guard came out in the low 60s). This piecewise curve recalibrates the whole
// league onto a truer scale — anchored so a proven mid-major starter like
// Tulane's Rowan Brumbaugh reads ~77 — while keeping deep-bench walk-ons near
// the 40s floor and preserving the 99 ceiling. Every player (real, generated,
// developed) flows through computeOverall, so ratings stay consistent.
function calibrateOverall(raw) {
  const r = clamp(raw, 40, 99);
  const out = r <= 62
    ? 42 + (r - 40) * ((77 - 42) / (62 - 40))
    : 77 + (r - 62) * ((99 - 77) / (99 - 62));
  return clamp(Math.round(out), 40, 99);
}

function computeOverall(pos, attrs) {
  const w = POS_WEIGHTS[pos] || POS_WEIGHTS.SF;
  let sum = 0;
  for (const k of ATTR_KEYS) sum += (attrs[k] ?? 40) * (w[k] ?? 0);
  return calibrateOverall(Math.round(sum));
}

// A player's effective overall if fielded at `pos` — identical to their listed
// overall at their natural position, lower when slotted somewhere their skills
// don't fit. This is the out-of-position penalty, applied wherever the depth
// chart actually plays someone.
function overallAtPos(player, pos) {
  return computeOverall(pos, player.attrs);
}

// Re-apply persisted progression points on top of a freshly (re)derived
// attribute set. Real players re-derive from their real stat line every year,
// so their manually-earned development would vanish without this.
function applyBoosts(attrs, boosts) {
  if (!boosts) return attrs;
  const out = { ...attrs };
  for (const k of ATTR_KEYS) if (boosts[k]) out[k] = clamp((out[k] ?? 40) + boosts[k], 40, 99);
  return out;
}

function ratingToStars(rating) {
  if (rating >= 0.985) return 5;
  if (rating >= 0.930) return 4;
  if (rating >= 0.850) return 3;
  if (rating >= 0.780) return 2;
  return 1;
}

// A raw stat line means very different things depending on who you racked
// it up against — 10 ppg carrying real minutes at a blue-blood program
// against elite competition should outweigh 20 ppg padded at the bottom
// of a small conference. This scales the per-game inputs by strength of
// competition (tier, 0..1 from team prestige) before turning them into
// attributes, rather than trusting raw box-score numbers at face value.
function competitionMultiplier(tier) {
  return 0.65 + tier * 0.8; // tier 0 (weakest programs) -> 0.65x, tier 1 (blue bloods) -> 1.45x
}

// How far apart blue-blood and bottom-tier talent should sit for equal box
// production. Recruiting, development, coaching, and daily competition all
// compound at a top program, so a Duke wing should clearly out-rate a
// same-numbers guard at a low-major. This is the peak-to-valley overall swing.
const PRESTIGE_SPREAD = 13;

// A tier-based additive shift applied to a real player's derived attributes.
// Prestige 3 (tier 0.5) is the neutral pivot: high-majors get lifted, low-majors
// get pushed down. Crucially, the downward push is softened for proven
// statistical outliers (a big careerOutlierBonus) so a genuine star at a small
// school — a Damian-Lillard-at-Weber-State type — keeps the rating he earned.
function prestigeTalentShift(tier, careerBonus) {
  const raw = (tier - 0.5) * PRESTIGE_SPREAD;
  if (raw >= 0) return raw; // high-prestige always gets the full bump
  const relief = clamp((careerBonus || 0) / 12, 0, 1); // 0..1, 1 = elite outlier
  return raw * (1 - relief * 0.8); // outliers claw back up to 80% of the penalty
}

function genAttrsFromTier(tier, pos = "SF") {
  // tier ~ 0..1, higher = more talented incoming baseline. Mapped onto the
  // 40-99 scale: a bottom-tier program's baseline lands near 40, a blue-blood's
  // near 86. Attributes are biased by position so a generated PG handles/shoots
  // and a generated C rebounds/protects the rim.
  const base = 40 + tier * 46;
  const g = POS_GUARDNESS[pos] ?? 0.5, big = 1 - g;
  const a = (bias = 0) => clamp(Math.round(rand(base - 9, base + 9) + bias), 40, 99);
  return {
    scoring: a(),
    threePoint: a(g * 6 - 3),
    rebounding: a(big * 8 - 4),
    passing: a(g * 6 - 3),
    ballHandling: a(g * 8 - 4),
    steals: a(g * 4 - 2),
    blocks: a(big * 8 - 4),
    perimeterDefense: a(g * 4 - 2),
    postDefense: a(big * 8 - 4),
    athleticism: a(),
    potential: clamp(Math.round(rand(base, base + 24)), 40, 99),
  };
}

// Derive attributes from a real player's actual per-game production instead
// of a random tier roll — this is what makes a real 20+ ppg scorer actually
// rate as a good player instead of a random dice roll. `tier` should be the
// strength of competition they actually earned these stats against (the
// team they played for), NOT necessarily the team signing them.
function genAttrsFromRealStats(real, tier, careerBonus = 0, pos = "SF") {
  const mult = competitionMultiplier(tier);
  // Convert season totals -> per game, then scale by competition and damp
  // tiny samples so a 3-game fluke can't out-rate a full-season contributor.
  const rel = sampleReliability(real.gp);
  const ppg = perGame(real.ppg, real.gp) * mult * rel;
  const rpg = perGame(real.rpg, real.gp) * mult * rel;
  const apg = perGame(real.apg, real.gp) * mult * rel;
  const prod = ppg + rpg + apg;
  const g = POS_GUARDNESS[pos] ?? 0.5, big = 1 - g;
  const cb = careerBonus; // 0-12, credit for proven outliers regardless of level
  const R = (v) => clamp(Math.round(v), 40, 99);
  // Only ppg/rpg/apg are available, so each attribute is derived from the box
  // stat that best correlates with it, then shaded by position tendency:
  // scoring/passing/rebounding come straight off production; shooting and ball
  // handling lean guard; blocks and post defense lean big; steals/perimeter D
  // lean guard. Career + competition credit lifts genuine talents.
  const core = {
    scoring: R(42 + ppg * 2.3 + cb),
    threePoint: R(42 + ppg * 1.3 * (0.5 + g) + g * 8 + cb * 0.6),
    rebounding: R(40 + rpg * 4.6 + big * 4 + cb * 0.5),
    passing: R(40 + apg * 6.0 + cb * 0.5),
    ballHandling: R(42 + apg * 3.5 + g * 14 + cb * 0.4),
    steals: R(42 + apg * 1.6 + g * 8 + Math.min(prod, 20) * 0.2 + cb * 0.3),
    blocks: R(40 + rpg * 2.2 + big * 12 + cb * 0.3),
    perimeterDefense: R(44 + g * 10 + Math.min(prod, 22) * 0.3 + tier * 10 + cb * 0.3),
    postDefense: R(42 + rpg * 2.6 + big * 12 + tier * 8 + cb * 0.3),
    athleticism: R(46 + Math.min(prod, 24) * 0.6 + tier * 8 + cb * 0.4),
  };
  // Spread talent apart by program prestige (with the outlier carve-out).
  const shift = prestigeTalentShift(tier, cb);
  if (shift !== 0) for (const k of ATTR_KEYS) core[k] = clamp(Math.round(core[k] + shift), 40, 99);
  const peak = Math.max(core.scoring, core.rebounding, core.passing);
  const potential = clamp(Math.round(rand(peak - 2, Math.min(99, peak + 10))), 40, 99);
  return { ...core, potential };
}

// A real player who logged no games / no production barely played. Rate them
// as a deep-bench walk-on regardless of program prestige — this is the fix
// for no-stat guys (e.g. Steve Johnson at Duke) reading as 90+ overall
// because they used to fall through to the blue-blood tier roll.
// Auto-generated walk-ons, and real players who never logged real minutes,
// rate as deep-bench bodies: every overall lands in the 40-45 band by
// construction (all four driving attributes are drawn from 40-45).
function genAttrsWalkOn() {
  const a = () => clamp(randInt(40, 45), 40, 45);
  const out = {};
  for (const k of ATTR_KEYS) out[k] = a();
  out.potential = clamp(randInt(44, 60), 40, 99);
  return out;
}

// Maps CBBD's free-text position strings onto our five roster slots. Returns
// null for generic/unknown tags ("Guard", "Forward", "Athlete", "N/A") so a
// stat-based inference can take over.
function mapRealPosition(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes("point")) return "PG";
  if (s.includes("shooting")) return "SG";
  if (s.includes("center")) return "C";
  if (s.includes("power")) return "PF";
  if (s.includes("small")) return "SF";
  return null;
}

// Data has no height, and position tags are frequently generic or flat-out
// wrong (e.g. Antoine Jacks, a sub-6ft point guard, tagged Power Forward). We
// infer a slot from the player's statistical profile instead: assist-heavy
// guards, rebound-heavy bigs, everything else on the wing.
function inferPositionFromStats(real) {
  const gp = Number(real?.gp) || 0;
  if (!gp) return null;
  const ppg = perGame(real.ppg, gp);
  const rpg = perGame(real.rpg, gp);
  const apg = perGame(real.apg, gp);
  if (apg >= 3.5 && apg >= rpg) return "PG";
  if (rpg >= 7) return "C";
  if (rpg >= 5.2) return "PF";
  if (apg >= 2.2 && rpg < 4.2) return apg >= 3 ? "PG" : "SG";
  if (rpg >= 3.8) return "SF";
  return apg >= 1.6 ? "SG" : "SF";
}

// The final slot for a real player: trust a SPECIFIC tag (Point/Shooting/Small/
// Power/Center) unless the stats make it clearly implausible — a "big" who
// never rebounds and dishes like a guard gets reclassified. Generic/missing
// tags fall straight through to the stat inference.
function resolvePosition(real) {
  const mapped = mapRealPosition(real?.position);
  const inferred = inferPositionFromStats(real);
  if (!mapped) return inferred || "SF";
  const gp = Number(real?.gp) || 0;
  if (gp > 0 && inferred) {
    const listedBig = mapped === "C" || mapped === "PF";
    const playsGuard = inferred === "PG" || inferred === "SG";
    if (listedBig && playsGuard && perGame(real.rpg, gp) < 3.5 && perGame(real.apg, gp) >= 2.5) {
      return inferred; // tagged as a big but statistically a guard
    }
    const listedGuard = mapped === "PG" || mapped === "SG";
    const playsBig = inferred === "C" || inferred === "PF";
    if (listedGuard && playsBig && perGame(real.rpg, gp) >= 7 && perGame(real.apg, gp) < 1.5) {
      return inferred; // tagged as a guard but statistically a big
    }
  }
  return mapped;
}

// Drop rows that don't look like real men's-D1 roster members — the source
// mixes in stray/erroneous names (e.g. a women's-team player showing up on a
// men's roster) that recorded no participation at all. We can't ADD players
// the dataset is missing, but we can filter obvious non-participants.
function isPlausibleRosterRow(r) {
  if (!r || !r.player) return false;
  const gp = Number(r.gp) || 0;
  const anyStat = (Number(r.ppg) || 0) + (Number(r.rpg) || 0) + (Number(r.apg) || 0) > 0;
  if (gp <= 0 && !anyStat) return false;
  return true;
}

function makePlayer({ pos, classYear, prestige, starsAtSigning, real, walkOn }) {
  const tier = clamp((prestige - 1) / 4 + rand(-0.12, 0.12), 0, 1);
  const gp = Number(real?.gp) || 0;
  // A real player only rates off their box score if they actually PRODUCED —
  // a meaningful sample (5+ games) and non-trivial combined per-game output.
  // Otherwise they're a deep-bench body / walk-on and rate in the 40-45 band,
  // regardless of how prestigious their program is (fixes no-impact players at
  // blue bloods reading like rotation pieces).
  const combinedPg = perGame(real?.ppg, gp) + perGame(real?.rpg, gp) + perGame(real?.apg, gp);
  const hasStats = !!real && gp >= 5 && combinedPg >= 3;
  // Real contributor -> derive from real production (+ career-outlier credit).
  // Everyone else — real no-stat benchwarmers AND purely generated filler /
  // walk-ons — rates in the 40-45 band.
  const attrs = hasStats
    ? genAttrsFromRealStats(real, tier, careerOutlierBonus(real.player), pos)
    : genAttrsWalkOn();
  const overall = computeOverall(pos, attrs);
  return {
    id: uid(),
    name: real?.player || fullName(),
    realName: !!real,
    realKey: real?.player || null,
    originalTier: tier,
    realStats: hasStats,
    // Purely generated roster filler (no real-data counterpart) are walk-ons and
    // can never hold a scholarship. Real players are scholarship-eligible; the
    // final scholarship/non-scholarship split is decided by assignScholarships.
    generatedWalkOn: !real && !!walkOn,
    scholarship: !!real,
    boosts: {},
    pos,
    class: classYear,
    height: `${randInt(6, 6)}'${randInt(9, 11)}"`.replace("6'11\"", "6'11\""),
    attrs,
    overall,
    starsAtSigning: starsAtSigning ?? null,
    season: { gp: 0, pts: 0, reb: 0, ast: 0 },
    career: { pts: 0, reb: 0, ast: 0, gp: 0 },
  };
}

const ROSTER_SIZE = 16;        // every team carries a full 16-man roster
const SCHOLARSHIP_LIMIT = 13;  // at most 13 of them are on scholarship

// Decide who holds a scholarship: generated walk-ons never do; among the real
// players, the top 13 by overall are on scholarship and any beyond that (a team
// carrying more than 13 real players) drop to non-scholarship — i.e. the
// statistically weakest real players lose the scholarship, per the roster rules.
function assignScholarships(roster) {
  const realOnes = roster.filter((p) => !p.generatedWalkOn);
  const ranked = [...realOnes].sort((a, b) => b.overall - a.overall);
  const scho = new Set(ranked.slice(0, SCHOLARSHIP_LIMIT).map((p) => p.id));
  return roster.map((p) => ({ ...p, scholarship: !p.generatedWalkOn && scho.has(p.id) }));
}

function buildInitialRoster(team, year) {
  const classesForSlot = ["SR", "JR", "SO", "FR"];
  // Use the player's TRUE career start (earliest season anywhere in the data),
  // not the data's per-team startSeason — otherwise every transfer reads FR.
  const realClassFor = (real) => realClassForName(real?.player, year, real?.startSeason);

  // Every real player on the team makes the roster — no position-slot cap can
  // drop a genuine contributor (the bug that hid Tulane's Rowan Brumbaugh).
  let roster = shuffled(realPlayersFor(team, year)).map((r, i) => {
    const pos = resolvePosition(r) || "SF";
    return makePlayer({ pos, classYear: realClassFor(r) || classesForSlot[i % classesForSlot.length], prestige: team.prestige, real: r });
  });

  // If a team somehow lists more than 16 real players, keep the best 16 so the
  // stars are never the ones cut.
  if (roster.length > ROSTER_SIZE) {
    roster = [...roster].sort((a, b) => b.overall - a.overall).slice(0, ROSTER_SIZE);
  }

  // Fill any remaining spots to a full 16 with generated walk-ons at whatever
  // position is currently thinnest.
  while (roster.length < ROSTER_SIZE) {
    const counts = Object.fromEntries(POSITIONS.map((p) => [p, 0]));
    roster.forEach((p) => { counts[p.pos] = (counts[p.pos] || 0) + 1; });
    const thinnest = POSITIONS.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    roster.push(makePlayer({ pos: thinnest, classYear: pick(["FR", "SO", "JR"]), prestige: team.prestige, walkOn: true }));
  }

  return assignScholarships(roster);
}

function defaultDepthChart(roster) {
  const dc = { PG: [], SG: [], SF: [], PF: [], C: [] };
  POSITIONS.forEach((p) => {
    dc[p] = roster.filter((pl) => pl.pos === p)
      .sort((a, b) => b.overall - a.overall)
      .map((pl) => pl.id);
  });
  return dc;
}

/* =========================================================================
   RECRUITING
   ========================================================================= */
// The torvik hometown field is an object { city, state, latitude, longitude }.
// For US players `state` is a 2-letter code with real coordinates; for
// internationals `state` holds a country/region name and coords are null.
// Returns a normalized shape the recruiting UI and visit-cost model both use.
function normalizeHometown(h) {
  if (!h || typeof h !== "object") {
    return { city: null, state: "\u2014", label: "\u2014", lat: null, lng: null, international: false };
  }
  const rawState = h.state ? String(h.state).trim() : "";
  const code = rawState.toUpperCase();
  const domestic = US_STATES.has(code);
  if (domestic) {
    let lat = typeof h.latitude === "number" ? h.latitude : null;
    let lng = typeof h.longitude === "number" ? h.longitude : null;
    if (lat == null && STATE_CENTROIDS[code]) { lat = STATE_CENTROIDS[code].lat; lng = STATE_CENTROIDS[code].lng; }
    const label = h.city ? `${h.city}, ${code}` : code;
    return { city: h.city || null, state: code, label, lat, lng, international: false };
  }
  // International — flatten to a single "International" bucket for filtering,
  // but keep the country/city around for the tooltip.
  const place = h.city && rawState ? `${h.city}, ${rawState}` : (rawState || h.city || "International");
  return { city: h.city || null, state: "INTL", label: "International", place, lat: null, lng: null, international: true };
}

// Real players whose real career started THIS year, at any real team —
// i.e. actual newcomers (true freshmen or transfers/JUCO) rather than
// procedurally generated prospects. This is what "signing" now competes
// over when we have real data for the year; falls back to the synthetic
// generator below when we don't (e.g. years past what you've imported).
// Finds one of our known 365 D1 programs by its real-data team-name
// string, or null if it's not one of ours (i.e. it's a D2/D3/NAIA/etc
// program CBBD also tracks that we don't want treating as a D1 recruit
// source).
function findOurTeamByRealName(realTeamName) {
  const key = normalizeTeamKey(realTeamName);
  return TEAMS.find((t) => normalizeTeamKey(TORVIK_TEAM_ALIASES[t.name] || t.name) === key) || null;
}

// Every prospect carries a 1-5 star rating now (no more "unranked"). Stars are
// driven by a composite production value adjusted for level of competition.
function starsFromValue(v) {
  if (v >= 17) return 5;
  if (v >= 12) return 4;
  if (v >= 7) return 3;
  if (v >= 3) return 2;
  return 1;
}

// Fresh, per-cycle recruiting-trail bookkeeping shared by every recruit object.
function freshTrailState() {
  return {
    committedTo: null,
    interest: 0,               // 0-100 warmth toward YOUR program
    rivalPressure: randInt(15, 45),
    offerExtended: false,
    callsUsed: 0,
    callsThisWeek: 0,
    visitsUsed: 0,             // official visits (1 max)
    homeVisitsUsed: 0,         // home visits (2 max/season, not same week)
    homeVisitWeek: 0,
    signWeek: null,
    signAttempts: 0,           // total sign attempts made on this recruit (max 2)
    signAttemptWeek: null,     // last week a sign attempt was made (1 per week)
  };
}

// Build one board entry from a real newcomer row for `year`.
function buildRealNewcomer(r, year) {
  const ourTeam = findOurTeamByRealName(r.team);
  const originalPrestige = ourTeam?.prestige ?? 2;
  const tier = clamp((originalPrestige - 1) / 4, 0, 1);
  const transfer = isTransferName(r.player, year);
  const classYear = transfer ? (realClassForName(r.player, year, r.startSeason) || "SO") : "FR";
  // Grade off the debut season so scouts rate a prospect the way they would
  // coming out of high school, regardless of how the career later develops.
  const firstRow = transfer ? (realStatRowForName(r.player, careerStartYear(r.player, r.startSeason)) || r) : r;
  const frGp = Number(firstRow.gp) || 0;
  const frPpg = perGame(firstRow.ppg, firstRow.gp);
  const frRpg = perGame(firstRow.rpg, firstRow.gp);
  const frApg = perGame(firstRow.apg, firstRow.gp);
  // Composite production (points + boards + assists), scaled by strength of
  // competition, then nudged by a career-arc credit so proven talents from
  // small schools still grade like the stars they became.
  const rawValue = frPpg + frRpg * 0.7 + frApg * 0.9;
  const adjustedValue = rawValue * competitionMultiplier(tier) * sampleReliability(frGp) + careerOutlierBonus(r.player) * 0.4;
  const stars = starsFromValue(adjustedValue);
  const rating = clamp(0.55 + (adjustedValue / 26) * 0.44, 0.55, 1.0);
  const ht = normalizeHometown(r.hometown);
  return {
    id: uid(),
    name: r.player,
    pos: resolvePosition(r) || pick(POSITIONS),
    state: ht.state,
    hometown: ht.label,
    hometownPlace: ht.place || ht.label,
    hometownLat: ht.lat,
    hometownLng: ht.lng,
    international: ht.international,
    classYear,
    isTransfer: transfer,
    stars,
    rating: Math.round(rating * 10000) / 10000,
    real: true,
    realStats: { ppg: firstRow.ppg, rpg: firstRow.rpg, apg: firstRow.apg, gp: firstRow.gp },
    originalTeam: r.team,
    originalPrestige,
    signedPrestige: originalPrestige, // caliber of program they actually chose
    adjustedValue,
    hsStatline: { ppg: frPpg.toFixed(1), rpg: frRpg.toFixed(1) },
    ...freshTrailState(),
  };
}

// Real newcomers for `year`, optionally filtered to true freshmen or transfers.
// De-duped by name (the source can list a player under multiple team rows).
function realNewcomersFor(year, kind = "all") {
  const rows = torvikPlayers[String(year)];
  if (!rows || !rows.length) return [];
  const seen = new Set();
  const newcomers = rows.filter((r) => {
    if (!(r.player && r.startSeason === year && isPlausibleRosterRow(r) && findOurTeamByRealName(r.team))) return false;
    if (seen.has(r.player)) return false;
    seen.add(r.player);
    return true;
  });
  return newcomers
    .map((r) => buildRealNewcomer(r, year))
    .filter((rec) => kind === "all" ? true : kind === "transfer" ? rec.isTransfer : !rec.isTransfer)
    .sort((a, b) => b.adjustedValue - a.adjustedValue);
}

// Synthetic fallback for cycles/portals with no real data.
function genSyntheticPool(kind) {
  const pool = [];
  const n = kind === "transfer" ? 45 : 90;
  for (let i = 0; i < n; i++) {
    const productionScore = randInt(35, 99);
    const adjustedValue = (productionScore / 99) * 22;
    const stars = starsFromValue(adjustedValue);
    const rating = clamp(0.55 + (adjustedValue / 26) * 0.44, 0.55, 1.0);
    const pos = pick(POSITIONS);
    const stCode = pick(STATES);
    const centroid = STATE_CENTROIDS[stCode] || null;
    pool.push({
      id: uid(),
      name: fullName(),
      pos,
      state: stCode,
      hometown: stCode,
      hometownPlace: stCode,
      hometownLat: centroid ? centroid.lat : null,
      hometownLng: centroid ? centroid.lng : null,
      international: false,
      classYear: kind === "transfer" ? pick(["SO", "JR", "SR"]) : "FR",
      isTransfer: kind === "transfer",
      stars,
      rating: Math.round(rating * 10000) / 10000,
      productionScore,
      adjustedValue,
      signedPrestige: clamp(Math.round(stars), 1, 5),
      hsStatline: {
        ppg: ((productionScore / 99) * 22 + rand(2, 6)).toFixed(1),
        rpg: ((pos === "C" || pos === "PF") ? (productionScore / 99) * 10 + rand(1, 3) : (productionScore / 99) * 5 + rand(1, 2)).toFixed(1),
      },
      ...freshTrailState(),
    });
  }
  return pool;
}

// Assign a national rank (1 = best) across the whole board by prospect value.
function rankBoard(board) {
  const sorted = [...board].sort((a, b) => (b.adjustedValue ?? (b.rating ?? 0) * 20) - (a.adjustedValue ?? (a.rating ?? 0) * 20));
  sorted.forEach((r, i) => { r.nationalRank = i + 1; });
  return sorted;
}

// In-season high-school class (true freshmen only; transfers wait for the
// off-season portal below).
function genRecruitPool(year) {
  const real = realNewcomersFor(year, "fr");
  return rankBoard(real.length > 0 ? real : genSyntheticPool("fr"));
}

// Off-season transfer portal.
function genTransferBoard(year) {
  const real = realNewcomersFor(year, "transfer");
  return rankBoard(real.length > 0 ? real : genSyntheticPool("transfer"));
}

// Seed each recruit's STARTING interest relative to the coach's program: a
// recruit who (in real life) chose this exact program starts warm (50-75%),
// one who chose a similar-caliber program starts warmer than one who chose a
// very different level. A blue-chip who signed with a powerhouse has ~no
// interest in a low-major — the Anthony-Davis-won't-look-at-you effect.
function seedInterest(board, team) {
  return board.map((r) => {
    // Hometown pull: recruits within 250 miles of campus lean toward staying
    // close, so give them a standing interest bump.
    const miles = recruitDistanceMiles(r, team);
    const proximityBoost = miles != null && miles <= 250 ? 12 : 0;
    const here = r.real && findOurTeamByRealName(r.originalTeam)?.id === team.id;
    if (here) return { ...r, interest: clamp(randInt(50, 75) + proximityBoost, 1, 90), proximityBoost };
    const signedPr = r.signedPrestige ?? r.originalPrestige ?? 3;
    const gap = Math.abs(team.prestige - signedPr);
    const interest = clamp(Math.round(58 - gap * 20 + rand(-6, 6)) + proximityBoost, 1, 67);
    return { ...r, interest, proximityBoost };
  });
}

/* --- Skill-based recruiting actions ------------------------------------ */
// Per spec: offer once (5), phone calls (5, up to twice a week), official
// visit (25, once per recruit), home visit (20, twice a season but not in the
// same week). Interest gained scales with the effort — a visit lands far more
// than a call.
const RECRUIT_ACTIONS = {
  CALL:  { key: "CALL",  label: "Phone Call",        cost: 5,  gain: [4, 8],   perWeek: 2 },
  OFFER: { key: "OFFER", label: "Scholarship Offer", cost: 5,  gain: [6, 10],  oneTime: true },
  VISIT: { key: "VISIT", label: "Official Visit",    cost: 12, gain: [16, 26], maxUses: 1 },
  HOME:  { key: "HOME",  label: "Home Visit",        cost: 9,  gain: [11, 18], maxSeason: 2 },
};

// Visit pricing scales with how far a recruit's hometown is from campus. Within
// 100 miles it's the base; every additional 300 miles adds 25% of the base
// (additive), capped. International recruits always pay the cap.
const VISIT_COST = {
  VISIT: { base: 12, cap: 40 },
  HOME:  { base: 9,  cap: 35 },
};

// Miles from a recruit's hometown to the coach's campus, or null when unknown
// (international, or a program we have no coordinates for).
function recruitDistanceMiles(recruit, team) {
  if (!recruit || recruit.international) return null;
  const home = recruit.hometownLat != null ? { lat: recruit.hometownLat, lng: recruit.hometownLng } : null;
  const campus = team ? TEAM_LOCATIONS[team.id] : null;
  return haversineMiles(home, campus);
}

// Point cost of a distance-priced visit for this recruit.
function visitCostFor(recruit, actionKey, team) {
  const spec = VISIT_COST[actionKey];
  if (!spec) return RECRUIT_ACTIONS[actionKey]?.cost ?? 0;
  if (!recruit || recruit.international) return spec.cap;
  const miles = recruitDistanceMiles(recruit, team);
  if (miles == null) return spec.cap;
  const increments = Math.floor(Math.max(0, miles - 100) / 300);
  return Math.min(Math.round(spec.base * (1 + 0.25 * increments)), spec.cap);
}

// Point cost of any recruiting action: visits scale with distance, everything
// else is the flat action cost.
function actionCostFor(actionKey, recruit, team) {
  if (actionKey === "VISIT" || actionKey === "HOME") return visitCostFor(recruit, actionKey, team);
  return RECRUIT_ACTIONS[actionKey].cost;
}

// Weekly recruiting points by program tier: high-majors 100, mid-majors 75,
// low-majors 50.
function weeklyRecruitingBudget(team) {
  if (team.prestige >= 4) return 100;
  if (team.prestige === 3) return 75;
  return 50;
}

function canTakeAction(recruit, actionKey, pointsLeft, weekIndex = 0, team = null) {
  const action = RECRUIT_ACTIONS[actionKey];
  if (recruit.committedTo) return false;
  if (pointsLeft < actionCostFor(actionKey, recruit, team)) return false;
  if (actionKey === "OFFER") return !recruit.offerExtended;
  if (actionKey === "CALL") return (recruit.callsThisWeek || 0) < action.perWeek;
  if (actionKey === "VISIT") return (recruit.visitsUsed || 0) < action.maxUses;
  if (actionKey === "HOME") return (recruit.homeVisitsUsed || 0) < action.maxSeason && recruit.homeVisitWeek !== weekIndex;
  return false;
}

// Every interest gain (calls, offers, visits) is scaled down 30% so warming a
// recruit up is meaningfully harder to do.
const INTEREST_GAIN_MULT = 0.7;

function applyRecruitAction(recruit, actionKey, weekIndex = 0) {
  const action = RECRUIT_ACTIONS[actionKey];
  const gain = Math.max(1, Math.round(rand(action.gain[0], action.gain[1]) * INTEREST_GAIN_MULT));
  const next = { ...recruit, interest: clamp(recruit.interest + gain, 0, 100) };
  if (actionKey === "OFFER") next.offerExtended = true;
  if (actionKey === "CALL") { next.callsUsed = (next.callsUsed || 0) + 1; next.callsThisWeek = (next.callsThisWeek || 0) + 1; }
  if (actionKey === "VISIT") next.visitsUsed = (next.visitsUsed || 0) + 1;
  if (actionKey === "HOME") { next.homeVisitsUsed = (next.homeVisitsUsed || 0) + 1; next.homeVisitWeek = weekIndex; }
  return next;
}

// Chance to sign IS the recruit's interest, read 1:1 — the board never shows a
// prospect at high interest but low odds anymore. Rival pressure no longer
// suppresses this number; instead it drives whether a recruit commits elsewhere
// before you can close (see tickRecruitingWeek), preserving urgency without the
// interest/odds mismatch.
function signChance(recruit) {
  if (!recruit.offerExtended) return 0;
  return clamp(recruit.interest / 100, 0, 1);
}

// A sign attempt is only allowed when the recruit is better than a coin flip
// (>50% odds), and each recruit can be attempted at most once per week and at
// most twice overall. Returns why an attempt is (dis)allowed for UI + handlers.
const MAX_SIGN_ATTEMPTS = 2;
function signAttemptStatus(recruit, weekIndex) {
  const chance = signChance(recruit);
  const attempts = recruit.signAttempts || 0;
  if (!recruit.offerExtended) return { ok: false, reason: "offer", chance, attempts };
  if (attempts >= MAX_SIGN_ATTEMPTS) return { ok: false, reason: "max", chance, attempts };
  if (recruit.signAttemptWeek === weekIndex) return { ok: false, reason: "week", chance, attempts };
  if (chance <= 0.5) return { ok: false, reason: "odds", chance, attempts };
  return { ok: true, reason: null, chance, attempts };
}

function advanceRecruitingWeeks(board, fromWeek, weeksElapsed, totalWeeks) {
  let b = board;
  for (let i = 0; i < weeksElapsed; i++) b = tickRecruitingWeek(b, fromWeek + i + 1, totalWeeks);
  return b;
}

// Called once per recruiting week: rivals keep working the board, recruits
// commit as the cycle progresses, and by the final week everyone still
// uncommitted signs somewhere. Resets each recruit's weekly call allotment.
function tickRecruitingWeek(board, weekIndex = 1, totalWeeks = 30) {
  const late = clamp(weekIndex / totalWeeks, 0, 1); // 0..1 progress through cycle
  return board.map((r) => {
    if (r.committedTo) return { ...r, callsThisWeek: 0 };
    const rivalPressure = clamp(r.rivalPressure + rand(-2, 6), 5, 95);
    let committedTo = null;
    const forced = weekIndex >= totalWeeks;
    const rivalPull = rivalPressure * (0.5 + late * 0.9);
    if (forced) {
      committedTo = "rival"; // signing day — anyone you didn't land is gone
    } else if (r.interest < rivalPull && Math.random() < 0.03 + late * 0.28 + (rivalPressure - r.interest) / 320) {
      committedTo = "rival";
    }
    return { ...r, rivalPressure, committedTo, callsThisWeek: 0, signWeek: committedTo ? weekIndex : r.signWeek };
  });
}

// Per spec: unranked recruits get a rating derived from the school they
// sign with (prestige) plus their production, once they commit.
function resolveUnrankedRating(recruit, team) {
  const prestigeComponent = (team.prestige - 1) / 4; // 0..1
  const productionComponent = recruit.productionScore / 99; // 0..1
  const rating = 0.700 + prestigeComponent * 0.055 + productionComponent * 0.035 + rand(-0.006, 0.006);
  return clamp(Math.round(rating * 10000) / 10000, 0.700, 0.799);
}

function recruitToPlayer(recruit, team) {
  if (recruit.real) {
    // Use the tier they actually earned their stats against, not the
    // signing team's — a recruit's proven talent shouldn't change just
    // because they land somewhere different than where they played.
    const originalTier = clamp(((recruit.originalPrestige ?? team.prestige) - 1) / 4, 0, 1);
    const attrs = genAttrsFromRealStats(recruit.realStats, originalTier, careerOutlierBonus(recruit.name), recruit.pos);
    const overall = computeOverall(recruit.pos, attrs);
    return {
      id: uid(),
      name: recruit.name,
      realName: true,
      realKey: recruit.name,
      originalTier,
      realStats: true,
      generatedWalkOn: false,
      scholarship: true,
      boosts: {},
      pos: recruit.pos,
      class: recruit.classYear || "FR",
      height: `6'${randInt(0, 11)}"`,
      attrs,
      overall,
      starsAtSigning: recruit.stars,
      ratingAtSigning: recruit.rating,
      season: { gp: 0, pts: 0, reb: 0, ast: 0 },
      career: { pts: 0, reb: 0, ast: 0, gp: 0 },
    };
  }

  let rating = recruit.rating;
  let stars = recruit.stars;
  if (rating == null) {
    rating = resolveUnrankedRating(recruit, team);
    stars = ratingToStars(rating);
  }
  const tier = clamp((rating - 0.70) / 0.30, 0, 1);
  const attrs = genAttrsFromTier(tier, recruit.pos);
  const overall = computeOverall(recruit.pos, attrs);
  return {
    id: uid(),
    name: recruit.name,
    generatedWalkOn: false,
    scholarship: true,
    boosts: {},
    pos: recruit.pos,
    class: "FR",
    height: `6'${randInt(0, 11)}"`,
    attrs,
    overall,
    starsAtSigning: stars,
    ratingAtSigning: rating,
    season: { gp: 0, pts: 0, reb: 0, ast: 0 },
    career: { pts: 0, reb: 0, ast: 0, gp: 0 },
  };
}

/* =========================================================================
   NATIONAL STAT LEADERBOARD
   ========================================================================= */
// A league-wide per-game leaderboard covering every real D1 program in the
// game, not just the user's team. Every other program's line comes from that
// season's real production data (these teams aren't individually simmed), while
// the user's own team is overlaid with the stats their players ACTUALLY put up
// in the dynasty being played — so the coach's guys compete on the same board
// as the rest of the country.
function buildLeaderboard(year, userTeamId, userRoster) {
  const rows = torvikPlayers[String(year)] || [];
  // O(1) torvik-team-name -> our team lookup (mirrors findOurTeamByRealName).
  const teamByKey = new Map();
  for (const t of TEAMS) teamByKey.set(normalizeTeamKey(TORVIK_TEAM_ALIASES[t.name] || t.name), t);

  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const team = teamByKey.get(normalizeTeamKey(r.team));
    if (!team || team.id === userTeamId) continue; // user's team handled below
    const gp = Number(r.gp) || 0;
    if (gp < 5) continue;
    const key = `${r.player}|${team.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: key, name: r.player, teamId: team.id, teamName: team.name,
      pos: resolvePosition(r) || "\u2014", gp,
      ppg: perGame(r.ppg, gp), rpg: perGame(r.rpg, gp), apg: perGame(r.apg, gp),
      isUser: false,
    });
  }
  // Overlay the user's real simulated production (only players who've logged a game).
  for (const p of userRoster || []) {
    const gp = p.season?.gp || 0;
    if (gp < 1) continue;
    out.push({
      id: `user|${p.id}`, name: p.name, teamId: userTeamId,
      teamName: TEAM_MAP[userTeamId]?.name || "", pos: p.pos, gp,
      ppg: perGame(p.season.pts, gp), rpg: perGame(p.season.reb, gp), apg: perGame(p.season.ast, gp),
      isUser: true,
    });
  }
  return out;
}

/* =========================================================================
   SCHEDULE + SIM
   ========================================================================= */
const NONCONF_GAMES = 11;
const CONF_GAMES = 19;
// One recruiting "week" ticks per game played, so the recruiting cycle runs
// exactly the length of the regular season.
const TOTAL_SEASON_WEEKS = NONCONF_GAMES + CONF_GAMES;
const OFFSEASON_WEEKS = 4;
// Offseason player development: a fixed pool of points to distribute across the
// whole roster, capped so no single attribute on a player gains more than this.
const DEV_POINTS_PER_OFFSEASON = 50;
const DEV_MAX_PER_ATTR = 5;

// Conference games are the real, "correct" slate — every conference mate,
// home-and-away when that stays within a sane game count, otherwise once
// each. These are locked. Non-conference games are seeded with random
// opponents but left fully editable by the coach.
function genSchedule(team, year) {
  const conf = TEAMS.filter((t) => t.conf === team.conf && t.id !== team.id);
  const nonConf = TEAMS.filter((t) => t.conf !== team.conf && t.id !== team.id);
  const games = [];
  let week = 1;

  // Non-conference slots (freely editable).
  const seeds = shuffled(nonConf).slice(0, NONCONF_GAMES);
  for (let i = 0; i < NONCONF_GAMES; i++) {
    const opp = seeds[i] || pick(nonConf);
    games.push({ id: uid(), week: week++, oppId: opp.id, home: i % 2 === 0, conf: false, played: false, result: null });
  }

  // Conference slate — exactly CONF_GAMES games. Cycle through conference
  // mates (repeating as needed for small leagues, home-and-away) with balanced
  // home/away. A fixed conference length keeps records comparable across
  // conferences and lets a dominant mid-major stack up a gaudy in-league mark.
  const confPool = shuffled(conf.length ? conf : nonConf);
  for (let i = 0; i < CONF_GAMES; i++) {
    const opp = confPool[i % confPool.length];
    games.push({ id: uid(), week: week++, oppId: opp.id, home: i % 2 === 0, conf: true, played: false, result: null });
  }

  return games;
}

// Non-conference scheduling rules: a school may be booked at most once in the
// non-conference slate, and a team can never schedule a member of its own
// conference out of conference. Returns false for an opponent change that
// would break either rule (`slate` is the full schedule, `gameId` the game
// being edited so it doesn't count itself as a duplicate).
function nonConfOppAllowed(slate, gameId, oppId, teamConf) {
  const opp = TEAM_MAP[oppId];
  if (!opp || opp.conf === teamConf) return false;
  return !slate.some((g) => !g.conf && g.id !== gameId && g.oppId === oppId);
}

// A team's power MUST live on the same scale as `userTeamOverall` (the
// minutes-weighted player-OVR average, ~38-80) so the user's simulated games
// and the projected standings compare apples to apples. Player attributes are
// built from `38 + tier*40`, so we map prestige onto that exact range.
const LEAGUE_AVG_POWER = 50; // a league-average team; the .500 pivot

function teamPowerRating(team, strengthMap, year, { noise = true } = {}) {
  // Standings must be stable across re-renders, so callers that want a
  // deterministic value pass noise:false. Game sims keep the jitter.
  const jitter = noise ? rand(-3, 3) : 0;
  if (year != null) {
    const real = realSeasonFor(team, year);
    if (real && real.barthag != null && !Number.isNaN(real.barthag)) {
      // barthag is Torvik's win-probability-vs-an-average-team (0..1) — map
      // it onto the player-OVR scale (barthag .5 ~ a league-average roster).
      return clamp(35 + real.barthag * 55 + jitter, 25, 95);
    }
  }
  const drift = strengthMap[team.id] ?? 0;
  // Use the smooth prestige so gradual drift shows up in the standings even
  // before a program crosses to the next whole star.
  const prestige = team.prestigeExact ?? team.prestige;
  const talent = 38 + ((prestige - 1) / 4) * 40; // prestige 1->38 ... 5->78
  return clamp(talent + drift + jitter, 25, 92);
}

// Projected season win% for a team, centered so a league-average program is
// a coin flip and blue bloods top out around .95. Shared by standings and the
// per-team schedule projection so both tell the same story.
function projectedWinPct(power) {
  return clamp(0.5 + (power - LEAGUE_AVG_POWER) / 58, 0.05, 0.95);
}

// Per-season strength drift layered on top of a team's prestige baseline.
// Wide enough that programs run genuinely hot or cold year to year — this is
// what lets a mid-major occasionally dominate its conference and crash the
// national standings instead of the order being a fixed prestige ranking.
function genSeasonStrengths() {
  return Object.fromEntries(TEAMS.map((t) => [t.id, rand(-11, 11)]));
}

// Win probability for a team of `power` against a specific `oppPower`. Steeper
// than the national curve so the spread between the best and worst team in a
// conference genuinely shows up game to game.
function gameWinProb(power, oppPower) {
  // Steep enough that a clear talent edge is a strong favorite (not a coin
  // flip): a 10-point overall gap is ~a 79% winner, a 20-point gap ~92%. This
  // is what makes better-rated rosters actually win, and lets the best teams
  // reliably reach — and win — the postseason.
  return clamp(0.5 + (power - oppPower) / 34, 0.03, 0.97);
}

// Projected W-L from STRENGTH OF SCHEDULE, not raw prestige: a team is
// measured against its actual conference peers (CONF_GAMES) plus an average
// national non-conference field (NONCONF_GAMES). A mid-major that clearly
// outclasses its league piles up conference wins and can top the standings,
// while a blue blood in a brutal conference can be dragged down.
function projectedRecord(team, powerById) {
  const power = powerById[team.id];
  const peers = TEAMS.filter((t) => t.conf === team.conf && t.id !== team.id);
  const confAvg = peers.length
    ? peers.reduce((s, t) => s + powerById[t.id], 0) / peers.length
    : LEAGUE_AVG_POWER;
  const wins = Math.round(
    gameWinProb(power, confAvg) * CONF_GAMES + gameWinProb(power, LEAGUE_AVG_POWER) * NONCONF_GAMES
  );
  const games = CONF_GAMES + NONCONF_GAMES;
  return { wins, losses: games - wins };
}

/* =========================================================================
   PROGRAM PRESTIGE — history-seeded and fluid
   Prestige is no longer a fixed hand-authored label. Each program is SEEDED
   from its real historical track record (win%, national rank, recency-
   weighted), then drifts season to season as the dynasty plays out: sustained
   success raises it, sustained struggle lowers it. We track a smooth internal
   value (team.prestigeExact, 1.0–5.0) for gradual movement while every existing
   consumer keeps reading the familiar rounded 1–5 integer team.prestige.
   ========================================================================= */
// Preserve the authored reputation before any live mutation overwrites it, so
// re-seeding a new dynasty always starts from the original values.
for (const t of TEAMS) t.prestigeStatic = t.prestige;

const PRESTIGE_DRIFT = 0.15; // gradual: one season moves 15% toward the target

// Map a 0..1 quality onto the 1..5 prestige scale. Shared by the historical
// seed and the yearly drift target so both speak the same language.
function prestigeFromQuality(q) {
  return clamp(1 + ((q - 0.14) / 0.72) * 4, 1, 5);
}

// Recency-weighted quality of a program across every real season on record.
function historicalQuality(teamId) {
  const rec = teamRecordsRaw[teamId];
  if (!rec) return null;
  const years = Object.keys(rec).map(Number);
  if (!years.length) return null;
  const maxY = Math.max(...years);
  let wsum = 0, n = 0;
  for (const y of years) {
    const e = rec[String(y)];
    const games = e.w + e.l;
    if (!games) continue;
    const winPct = e.w / games;
    const rankQ = e.rank ? clamp(1 - (e.rank - 1) / 363, 0, 1) : 0.3;
    const wt = Math.pow(0.82, maxY - y); // recent seasons matter most
    wsum += (0.55 * winPct + 0.45 * rankQ) * wt;
    n += wt;
  }
  return n ? wsum / n : null;
}

// Starting prestige for every program: mostly its historical record, with a
// little weight left on the authored reputation so brand names don't crater on
// a down decade. Programs with no data keep their static value.
function baselinePrestigeById() {
  const out = {};
  for (const t of TEAMS) {
    const q = historicalQuality(t.id);
    const stat = t.prestigeStatic ?? t.prestige;
    out[t.id] = q == null ? stat : 0.75 * prestigeFromQuality(q) + 0.25 * stat;
  }
  return out;
}

// Quality (0..1) a team earned in a single completed season. Real seasons pull
// from the record book; beyond the data (or for the human coach's own result,
// passed via `override`) we fall back to the simulated record and power rating.
function seasonQualityFor(team, year, powerById, override) {
  if (override != null) return override;
  const real = teamRecordsRaw[team.id] && teamRecordsRaw[team.id][String(year)];
  if (real && real.w + real.l > 0) {
    const winPct = real.w / (real.w + real.l);
    const rankQ = real.rank
      ? clamp(1 - (real.rank - 1) / 363, 0, 1)
      : clamp((powerById[team.id] - 25) / 70, 0, 1);
    return 0.55 * winPct + 0.45 * rankQ;
  }
  const pr = projectedRecord(team, powerById);
  const g = pr.wins + pr.losses;
  const winPct = g ? pr.wins / g : 0.5;
  const rankQ = clamp((powerById[team.id] - 25) / 70, 0, 1);
  return 0.55 * winPct + 0.45 * rankQ;
}

// Nudge every program's prestige toward the target implied by the season that
// just finished. Gradual, so it takes several strong (or weak) years to move a
// program a full tier. `userQuality` carries the human coach's real outcome.
function driftPrestige(prevById, year, powerById, userTeamId, userQuality) {
  const next = {};
  for (const t of TEAMS) {
    const prev = prevById[t.id] ?? t.prestigeStatic ?? t.prestige;
    const q = seasonQualityFor(t, year, powerById, t.id === userTeamId ? userQuality : null);
    const target = prestigeFromQuality(q);
    next[t.id] = clamp(prev + (target - prev) * PRESTIGE_DRIFT, 1, 5);
  }
  return next;
}

// Push a prestige map onto the live team objects so every existing consumer
// (power baseline, recruiting, standings, UI stars) reads the current value.
// team.prestige stays a rounded 1–5 integer; team.prestigeExact holds the
// smooth value the power baseline uses for fluid standings between whole steps.
function applyLivePrestige(prestigeById) {
  if (!prestigeById) return;
  for (const t of TEAMS) {
    const exact = prestigeById[t.id];
    if (exact == null) continue;
    t.prestigeExact = Math.round(exact * 100) / 100;
    t.prestige = clamp(Math.round(exact), 1, 5);
  }
}

// Seed the league from history at load so even the pre-dynasty team picker
// reflects real track records. A running dynasty re-applies its own saved map.
applyLivePrestige(baselinePrestigeById());

/* =========================================================================
   RANKINGS
   Every team gets a record (user = real, others = projected) and a poll-style
   ranking score. Score blends win% (regressed toward .500 for small samples so
   a 1-0 start can't top the poll) with team quality, so blue bloods with good
   records rank high AND a dominant mid-major can crack the Top 25.
   ========================================================================= */
function powerTableFor(strengths, year) {
  return Object.fromEntries(
    TEAMS.map((t) => [t.id, teamPowerRating(t, strengths, year, { noise: false })])
  );
}

// Deterministic per-team season RNG. A given (seasonSeed, team, year) always
// yields the SAME emergent season within a save — so records are stable across
// re-renders — while a fresh season (new seed) plays out differently. That seed
// is what makes each playthrough vary instead of replaying fixed history.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seasonRngFor(seasonSeed, teamId, year) {
  let h = 2166136261 ^ (seasonSeed >>> 0);
  const key = `${teamId}|${year}`;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return mulberry32(h >>> 0);
}

// One CPU team's emergent season as a per-game win/loss sequence. Each game is a
// Bernoulli trial at the team's real win rate (or a power projection when there's
// no historical record), so the season AVERAGES near its real total but binomial
// variance swings it a few games either way — the "loosely anchored" model. Wins
// accrue game by game, so a record only fills in as its games are actually played
// rather than showing the final result from the opening tip.
function cpuSeasonSeq(team, year, powerById, seasonSeed) {
  const real = teamRecordsRaw[team.id] && teamRecordsRaw[team.id][String(year)];
  let G, p;
  if (real && real.w + real.l > 0) {
    G = real.w + real.l;
    p = real.w / G;
  } else {
    const pr = projectedRecord(team, powerById);
    G = pr.wins + pr.losses;
    p = G ? pr.wins / G : 0.5;
  }
  const rng = seasonRngFor(seasonSeed, team.id, year);
  const seq = new Array(G);
  for (let i = 0; i < G; i++) seq[i] = rng() < p ? 1 : 0;
  return { G, seq, realRank: real ? (real.rank || null) : null };
}

// Records THROUGH the games played so far. The user's row is their real played
// record; every CPU team shows the wins from the first `gamesPlayed` games of its
// emergent sequence (capped at its own schedule length). This is the single
// source both the poll and the standings read, so they always agree — and nothing
// posts a win before that game has actually been played.
function accruedRecordTable(powerById, userTeamId, userRecord, year, seasonSeed, gamesPlayed) {
  const seed = seasonSeed == null ? (Math.imul(year, 2654435761) >>> 0) : seasonSeed;
  const rec = {};
  for (const t of TEAMS) {
    if (t.id === userTeamId) {
      rec[t.id] = { wins: userRecord.w, losses: userRecord.l, realRank: null };
      continue;
    }
    const { G, seq, realRank } = cpuSeasonSeq(t, year, powerById, seed);
    const k = Math.min(Math.max(0, gamesPlayed), G);
    let w = 0;
    for (let i = 0; i < k; i++) w += seq[i];
    rec[t.id] = { wins: w, losses: k - w, realRank };
  }
  return rec;
}

function rankingScore(wins, losses, power, realRank, isUser = false, gamesPlayed = 0) {
  const games = wins + losses;
  const shrunkWinPct = (wins + 3) / (games + 6); // Bayesian shrink toward .500
  const quality = clamp((power - 25) / (92 - 25), 0, 1);
  // Winning is weighted heavily so a dominant team rises, but quality keeps
  // blue bloods near the top of a crowded field.
  let score = shrunkWinPct * 0.72 + quality * 0.28;
  // A real committee rank is used as a PRESEASON PRIOR, not a fixed verdict. It
  // seeds the opening poll — so blue bloods start ranked and gaudy-record mid-
  // majors don't flood the Top 25 in week 1 — then fades to nothing by midseason,
  // handing the poll over to the season that's actually being played. Combined
  // with the emergent (not fixed) records, this is what removes the
  // "predetermined final standings" feel while keeping the early poll believable.
  if (realRank && !isUser) {
    const priorScore = clamp(1 - (realRank - 1) / 120, 0, 1);
    const priorWeight = clamp(1 - gamesPlayed / 16, 0, 1) * 0.6; // 0.6 preseason -> 0 by game ~16
    score = score * (1 - priorWeight) + priorScore * priorWeight;
  } else if (isUser && games > 0) {
    // The user's program has NO fixed committee rank — it EARNS its ranking from
    // the season actually being played. We build a resume score on the same
    // 0..1 scale a real team's committee rank sits on, driven by how much the
    // coach is winning and how strong the roster they've assembled is. This is
    // what lets you take a mid-major like Pepperdine, recruit an elite roster,
    // and legitimately climb to #1, earn a top seed, and win a title the real
    // program never did — a dominant season (undefeated + elite roster) tops out
    // at ~#1-caliber, while a merely good year lands you in the back half of the
    // poll rather than instantly at the top.
    const winPct = wins / games;
    const winScore = clamp((winPct - 0.5) / 0.45, 0, 1); // .500 -> 0, .950 -> 1
    const rosterScore = clamp((power - 45) / (82 - 45), 0, 1); // roster 45 -> 0, 82 -> 1
    const resumeRank = 0.6 * winScore + 0.4 * rosterScore;
    score = 0.35 * score + 0.65 * resumeRank;
  }
  return score;
}

// Returns { ranked: [{team,wins,losses,power,score}], rankById } sorted best-first.
function computeRankings(powerById, recordById, userTeamId, gamesPlayed = 0) {
  const ranked = TEAMS.map((t) => {
    const r = recordById[t.id];
    return { team: t, wins: r.wins, losses: r.losses, power: powerById[t.id], score: rankingScore(r.wins, r.losses, powerById[t.id], r.realRank, t.id === userTeamId, gamesPlayed) };
  }).sort((a, b) => b.score - a.score || b.wins - a.wins || a.losses - b.losses || b.power - a.power);
  const rankById = {};
  ranked.forEach((row, i) => { rankById[row.team.id] = i + 1; });
  return { ranked, rankById };
}

/* =========================================================================
   BRACKET ENGINE (single elimination)
   A bracket is { seeds:[teamId..], rounds:[[matchup..]..], champion, done }.
   A matchup is { a, b, aSeed, bSeed, winner, scoreA, scoreB, bye }.
   b === null means a bye (a auto-advances). Seeding follows the standard
   bracket order so the 1 seed meets the last seed first and the top two seeds
   can only collide in the final.
   ========================================================================= */
function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

// Standard tournament seed slot order for a bracket of `size` (power of two):
// size 4 -> [1,4,2,3]; size 8 -> [1,8,4,5,2,7,3,6]; etc.
function seedSlots(size) {
  let arr = [1, 2];
  while (arr.length < size) {
    const sum = arr.length * 2 + 1;
    const next = [];
    for (const s of arr) { next.push(s); next.push(sum - s); }
    arr = next;
  }
  return arr;
}

// seededIds: team ids in seed order (index 0 = 1 seed).
function buildSingleElim(seededIds) {
  const n = seededIds.length;
  if (n === 0) return { seeds: [], rounds: [], champion: null, done: true };
  if (n === 1) return { seeds: seededIds, rounds: [], champion: seededIds[0], done: true };
  const size = nextPow2(n);
  const slots = seedSlots(size);
  const at = (seed) => (seed <= n ? seededIds[seed - 1] : null);
  const first = [];
  for (let i = 0; i < size; i += 2) {
    const aSeed = slots[i], bSeed = slots[i + 1];
    first.push({ a: at(aSeed), b: at(bSeed), aSeed, bSeed, winner: null, scoreA: null, scoreB: null, bye: false });
  }
  return { seeds: seededIds, rounds: [first], champion: null, done: false };
}

function fabricateScore(winnerPower, loserPower) {
  const base = 64 + (winnerPower + loserPower) / 12;
  const spread = clamp((winnerPower - loserPower) * 0.45, 1, 26) + rand(1, 9);
  const w = Math.round(base + spread / 2);
  const l = Math.round(base - spread / 2);
  return { w: Math.max(w, 52), l: Math.max(Math.min(l, w - 1), 47) };
}

// Resolve a single matchup. When the user's team is involved we sim with their
// real roster so postseason games honor the depth chart they've built.
function simMatchup(m, ctx) {
  if (m.winner) return m;
  if (m.a && !m.b) return { ...m, winner: m.a, bye: true };
  if (m.b && !m.a) return { ...m, winner: m.b, bye: true };
  if (!m.a && !m.b) return m;

  const { powerById, userTeamId, roster, depthChart, strengths, year, powerBaseline } = ctx;
  if (userTeamId && (m.a === userTeamId || m.b === userTeamId)) {
    const oppId = m.a === userTeamId ? m.b : m.a;
    const oppPower = teamPowerRating(TEAM_MAP[oppId], strengths, year);
    const res = simulateGame(roster, healthyDepthChart(depthChart, roster), oppPower, 0, powerBaseline);
    const winner = res.win ? userTeamId : oppId;
    const uScore = res.myScore, oScore = res.oppScore;
    return {
      ...m, winner,
      scoreA: m.a === userTeamId ? uScore : oScore,
      scoreB: m.b === userTeamId ? uScore : oScore,
      userBox: res.boxByPlayer,
    };
  }
  const pa = powerById[m.a], pb = powerById[m.b];
  const aWins = Math.random() < gameWinProb(pa, pb);
  const sc = fabricateScore(aWins ? pa : pb, aWins ? pb : pa);
  return { ...m, winner: aWins ? m.a : m.b, scoreA: aWins ? sc.w : sc.l, scoreB: aWins ? sc.l : sc.w };
}

// Play the current (last, unfinished) round of a bracket, then wire up the next.
function advanceBracketRound(bracket, ctx) {
  if (bracket.done || bracket.rounds.length === 0) return bracket;
  const rounds = bracket.rounds.map((r) => r.map((m) => ({ ...m })));
  const cur = rounds[rounds.length - 1];
  // Capture the user's box score exactly once, from a game resolved right now
  // in THIS round. A game the user already played live carries userBoxApplied,
  // so we skip it here — its stats were credited when they finished the game.
  let freshUserBox = null;
  const simmed = cur.map((m) => {
    const r = simMatchup(m, ctx);
    if (r.userBox && !r.userBoxApplied) { freshUserBox = r.userBox; r.userBoxApplied = true; }
    return r;
  });
  rounds[rounds.length - 1] = simmed;
  const winners = simmed.map((m) => m.winner).filter(Boolean);
  if (winners.length <= 1) {
    return { ...bracket, rounds, champion: winners[0] || null, done: true, _freshUserBox: freshUserBox };
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push({ a: winners[i], b: winners[i + 1] ?? null, winner: null, scoreA: null, scoreB: null, bye: false });
  }
  rounds.push(next);
  return { ...bracket, rounds, champion: null, done: false, _freshUserBox: freshUserBox };
}

// Locate the user's next PLAYABLE postseason game — an undecided matchup with
// both teams present, in the current round of whichever bracket is live. Byes
// (only one team) auto-resolve and aren't playable. Returns a locator the
// commit handler uses to write the result back into the exact matchup.
function findUserPendingMatchup(ps, userTeamId) {
  if (!ps || ps.phase === "done") return null;
  const scan = (bracket) => {
    if (!bracket || bracket.done || !bracket.rounds.length) return null;
    const ri = bracket.rounds.length - 1;
    const cur = bracket.rounds[ri];
    const mi = cur.findIndex((m) => !m.winner && m.a && m.b && (m.a === userTeamId || m.b === userTeamId));
    return mi >= 0 ? { roundIndex: ri, matchIndex: mi, matchup: cur[mi] } : null;
  };
  if (ps.phase === "conf") {
    for (const conf of CONF_LIST) {
      const loc = scan(ps.confBrackets[conf]);
      if (loc) return { where: "conf", conf, ...loc };
    }
  } else if (ps.phase === "madness" && ps.madness) {
    const md = ps.madness;
    if (md.finalFour && !md.finalFour.done) {
      const loc = scan(md.finalFour);
      if (loc) return { where: "finalFour", ...loc };
    } else {
      for (let ri = 0; ri < md.regions.length; ri++) {
        const loc = scan(md.regions[ri].bracket);
        if (loc) return { where: "region", regionIndex: ri, ...loc };
      }
    }
  }
  return null;
}

function bracketFullyPlayed(b) { return b.done; }

/* =========================================================================
   POSTSEASON: conference tournaments -> March Madness
   ========================================================================= */
const CONF_LIST = [...new Set(TEAMS.map((t) => t.conf))].sort();
const REGION_NAMES = ["East", "West", "South", "Midwest"];

// Seed each conference by its members' national ranking (best = 1 seed), then
// build a single-elim bracket where the top seed meets the bottom seed first.
function buildConfBrackets(rankById) {
  const byConf = {};
  for (const conf of CONF_LIST) {
    const members = TEAMS.filter((t) => t.conf === conf)
      .sort((a, b) => rankById[a.id] - rankById[b.id])
      .map((t) => t.id);
    byConf[conf] = buildSingleElim(members);
  }
  return byConf;
}

// 64-team field: every conference champ earns an auto-bid, then the highest
// remaining ranked teams fill the at-large pool. Seeds 1-16 across 4 regions
// are assigned by national rank in an S-curve so the regions are balanced.
function buildMadness(confChampions, rankById) {
  const championIds = new Set(Object.values(confChampions));
  const autoBids = [...championIds];
  const atLargePool = TEAMS
    .filter((t) => !championIds.has(t.id))
    .sort((a, b) => rankById[a.id] - rankById[b.id])
    .map((t) => t.id);
  const need = Math.max(0, 64 - autoBids.length);
  const field = [...autoBids, ...atLargePool.slice(0, need)].slice(0, 64);

  // Order the whole field by national rank, then snake seed lines into regions.
  field.sort((a, b) => rankById[a] - rankById[b]);
  const regionSeeds = [[], [], [], []]; // each fills to 16, index = seed-1
  for (let line = 0; line < 16; line++) {
    const four = field.slice(line * 4, line * 4 + 4);
    const order = line % 2 === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    four.forEach((id, i) => { regionSeeds[order[i]].push(id); });
  }
  const regions = regionSeeds.map((ids, i) => ({
    name: REGION_NAMES[i],
    bracket: buildSingleElim(ids),
  }));
  return { regions, finalFour: null, champion: null };
}

// True once all four regions have crowned a champion.
function regionsComplete(madness) {
  return madness.regions.every((r) => r.bracket.done && r.bracket.champion);
}

// Short label for the season-history row describing how the user's postseason
// ended (national champ, Final Four, conference champ, or a round exit).
function postseasonSummary(ps, userTeamId) {
  if (!ps) return null;
  if (ps.champion === userTeamId) return "National Champions";
  const md = ps.madness;
  if (md) {
    if (md.finalFour) {
      const inFF = md.finalFour.seeds.includes(userTeamId);
      if (md.finalFour.done && md.finalFour.champion !== userTeamId && inFF) return "Runner-up";
      if (inFF) return "Final Four";
    }
    const inField = md.regions.some((r) => r.bracket.seeds.includes(userTeamId));
    if (inField) return "NCAA Tournament";
  }
  const myConf = TEAM_MAP[userTeamId]?.conf;
  if (myConf && ps.confChampions?.[myConf] === userTeamId) return "Conference Champions";
  return null;
}

function depthChartMinutes(order) {
  // returns array parallel to `order` with minutes for that position group (40 total)
  const splits = [24, 11, 5, 0, 0];
  return order.map((_, i) => splits[i] ?? 0);
}

function userTeamOverall(roster, depthChart) {
  let totalW = 0, sum = 0;
  POSITIONS.forEach((pos) => {
    const order = depthChart[pos].filter((id) => roster.find((p) => p.id === id));
    const mins = depthChartMinutes(order);
    order.forEach((id, i) => {
      const pl = roster.find((p) => p.id === id);
      if (!pl || !mins[i]) return;
      // Grade each player at the slot they're actually playing, so fielding
      // someone out of position costs the team real strength.
      sum += overallAtPos(pl, pos) * mins[i];
      totalW += mins[i];
    });
  });
  return totalW ? sum / totalW : 55;
}

// The user's roster OVR average lives on a different scale than the barthag-
// derived power CPU teams use, so grading the user by raw OVR let weak real
// programs (e.g. Chicago State) steamroll their schedule. `baseline` pegs the
// SEASON-START real roster to the school's real barthag strength: hold the real
// roster and you play exactly like the real team (year one is true to history).
// From there, ROSTER_SENSITIVITY controls how fast the roster you actually build
// moves you off that historical anchor. At 1.8, a ~40-point OVR spread maps
// across nearly the full power scale, so recruiting — not the school's history —
// is what determines your strength once you reshape the team.
const ROSTER_SENSITIVITY = 1.8;
function userGamePower(roster, depthChart, baseline) {
  const raw = userTeamOverall(roster, depthChart);
  if (!baseline) return raw;
  return clamp(baseline.barthagPower + (raw - baseline.realOverall) * ROSTER_SENSITIVITY, 25, 95);
}

function simulateGame(roster, depthChart, oppPower, momentum = 0, baseline = null) {
  const myPower = userGamePower(roster, depthChart, baseline) + momentum;
  const diff = myPower - oppPower;
  // Talent drives the margin; the random term is small enough that upsets
  // happen but the better team wins the large majority of the time.
  const margin = diff * 0.75 + rand(-8, 8);
  const base = 66 + myPower / 6;
  const win = margin >= 0;
  let myScore = Math.max(Math.round(base + margin / 2 + rand(-4, 4)), 38);
  let oppScore = Math.max(Math.round(base - margin / 2 + rand(-4, 4)), 35);
  // Basketball has no ties — make sure the winner actually outscores the loser
  // (rounding + score floors can otherwise leave them equal).
  if (win && myScore <= oppScore) myScore = oppScore + randInt(1, 4);
  if (!win && oppScore <= myScore) oppScore = myScore + randInt(1, 4);

  // per-player box score
  const boxByPlayer = {};
  POSITIONS.forEach((pos) => {
    const order = depthChart[pos].filter((id) => roster.find((p) => p.id === id));
    const mins = depthChartMinutes(order);
    order.forEach((id, i) => {
      const m = mins[i];
      if (!m) return;
      const pl = roster.find((p) => p.id === id);
      const pts = Math.max(0, Math.round((m / 30) * (pl.attrs.scoring / 99) * 24 * rand(0.7, 1.3)));
      const reb = Math.max(0, Math.round((m / 30) * (pl.attrs.rebounding / 99) * 11 * rand(0.6, 1.4)));
      const ast = Math.max(0, Math.round((m / 30) * (pl.attrs.passing / 99) * 7 * rand(0.5, 1.5)));
      boxByPlayer[id] = { pts, reb, ast, min: m };
    });
  });

  return { win, myScore, oppScore, boxByPlayer };
}

// Convert the id-keyed box score into a display array (names + positions),
// stored on the schedule game so it can be reopened later.
function boxArray(boxByPlayer, roster) {
  return Object.entries(boxByPlayer)
    .map(([id, b]) => {
      const p = roster.find((x) => x.id === id);
      return { name: p ? p.name : "\u2014", pos: p ? p.pos : "", min: b.min, pts: b.pts, reb: b.reb, ast: b.ast };
    })
    .sort((a, b) => b.pts - a.pts);
}

/* =========================================================================
   YEAR-END PROGRESSION
   ========================================================================= */
function progressRosterForNewYear(roster, incoming, team, newYear) {
  const survivors = roster
    .filter((p) => p.class !== "SR")
    .map((p) => {
      const nextClass = CLASS_ORDER[CLASS_ORDER.indexOf(p.class) + 1];
      const rolledCareer = {
        pts: p.career.pts + p.season.pts,
        reb: p.career.reb + p.season.reb,
        ast: p.career.ast + p.season.ast,
        gp: p.career.gp + p.season.gp,
      };

      // Real players: track how their actual career went. Re-derive attributes
      // from their real stat line for the NEW season, so e.g. Kemba Walker
      // climbs 8.9 -> 14.6 -> 23.5 ppg and his overall rises to match. Star
      // rating (starsAtSigning) is intentionally left frozen at signing, so
      // deciding whom to sign off a freshman grade carries real risk/upside.
      if (p.realName && p.realKey && newYear != null) {
        const row = realStatRowForName(p.realKey, newYear);
        const gp = Number(row?.gp) || 0;
        if (row && gp > 0 && (row.ppg != null || row.rpg != null || row.apg != null)) {
          const ourTeam = findOurTeamByRealName(row.team);
          const tier = ourTeam ? clamp((ourTeam.prestige - 1) / 4, 0, 1) : (p.originalTier ?? 0.5);
          // Re-derive from the real stat line, then re-apply any progression
          // points spent on this player so development persists year to year.
          const attrs = applyBoosts(genAttrsFromRealStats(row, tier, careerOutlierBonus(p.realKey), p.pos), p.boosts);
          return {
            ...p, class: nextClass, attrs, overall: computeOverall(p.pos, attrs),
            career: rolledCareer, season: { gp: 0, pts: 0, reb: 0, ast: 0 },
          };
        }
      }

      // Generated players (and real players past their real career) develop
      // synthetically toward their potential. Attributes already carry any past
      // progression, so growth compounds on top of it.
      const growth = Math.round((p.attrs.potential - p.overall) * rand(0.05, 0.22));
      const bump = clamp(growth, -2, 9);
      const attrs = { potential: p.attrs.potential };
      for (const k of ATTR_KEYS) attrs[k] = clamp((p.attrs[k] ?? 40) + Math.round(bump * rand(0.6, 1.2)), 40, 99);
      return {
        ...p,
        class: nextClass,
        attrs,
        overall: computeOverall(p.pos, attrs),
        career: rolledCareer,
        season: { gp: 0, pts: 0, reb: 0, ast: 0 },
      };
    });
  let combined = [...survivors, ...incoming];

  // Cap at a full 16-man roster: if incoming recruits overfill it, the weakest
  // non-freshmen are the ones squeezed out.
  if (combined.length > ROSTER_SIZE) {
    combined.sort((a, b) => (a.class === "FR" ? 1 : 0) - (b.class === "FR" ? 1 : 0) || a.overall - b.overall);
    combined.splice(0, combined.length - ROSTER_SIZE);
  }

  // Fill up to a full 16 with walk-on freshmen at whatever position is thinnest.
  while (combined.length < ROSTER_SIZE) {
    const counts = Object.fromEntries(POSITIONS.map((p) => [p, 0]));
    combined.forEach((p) => { counts[p.pos] = (counts[p.pos] || 0) + 1; });
    const thinnest = POSITIONS.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    combined.push(makePlayer({ pos: thinnest, classYear: "FR", prestige: team?.prestige ?? 2, walkOn: true }));
  }

  return assignScholarships(combined);
}

/* =========================================================================
   INJURIES + MOMENTUM
   ========================================================================= */
function isHurt(p) { return (p.injuredGames || 0) > 0; }

// Depth chart with injured players pulled out — the effective rotation the
// coach actually fields on a given night.
function healthyDepthChart(depthChart, roster) {
  const dc = {};
  POSITIONS.forEach((pos) => {
    dc[pos] = (depthChart[pos] || []).filter((id) => {
      const p = roster.find((x) => x.id === id);
      return p && !isHurt(p);
    });
  });
  return dc;
}

// Signed win/loss streak read off the most recent games (positive = winning).
function currentStreak(schedule) {
  const played = schedule.filter((g) => g.played);
  let streak = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    const win = played[i].result.win;
    if (streak === 0) { streak = win ? 1 : -1; continue; }
    if ((win && streak > 0) || (!win && streak < 0)) streak += win ? 1 : -1;
    else break;
  }
  return streak;
}

// Confidence swing from a streak, folded into team power for the next game.
function momentumMod(streak) { return clamp(streak, -5, 5) * 0.75; }

function tickInjuries(roster) {
  return roster.map((p) => (isHurt(p) ? { ...p, injuredGames: p.injuredGames - 1 } : p));
}

// Small per-game chance a healthy rotation player tweaks something and misses
// a few games. Returns the updated roster and (if any) the new injury.
function maybeInjure(roster, rotationIds) {
  if (Math.random() >= 0.10) return { roster, injured: null };
  const cands = rotationIds.filter((id) => {
    const p = roster.find((x) => x.id === id);
    return p && !isHurt(p);
  });
  if (!cands.length) return { roster, injured: null };
  const id = pick(cands);
  const games = randInt(2, 6);
  const name = roster.find((p) => p.id === id).name;
  return {
    roster: roster.map((p) => (p.id === id ? { ...p, injuredGames: games } : p)),
    injured: { id, name, games },
  };
}

// The ids that logged real minutes in the healthy rotation (candidates for
// picking up a knock).
function rotationIdsOf(depthChart, roster) {
  const ids = [];
  const hdc = healthyDepthChart(depthChart, roster);
  POSITIONS.forEach((pos) => {
    depthChartMinutes(hdc[pos]).forEach((m, i) => { if (m > 0) ids.push(hdc[pos][i]); });
  });
  return ids;
}

/* =========================================================================
   AWARDS + HONORS
   ========================================================================= */
function awardScore(ppg, rpg, apg, rank) {
  const prod = ppg + rpg * 0.75 + apg * 0.85;
  const teamBonus = clamp((70 - (rank || 70)) / 70, 0, 1) * 9;
  return prod + teamBonus;
}

// Best real player line (per-game) for a team in a given season, or null.
function bestRealLine(team, year) {
  const rows = realPlayersFor(team, year);
  if (!rows.length) return null;
  const mapped = rows
    .map((r) => ({
      name: r.player,
      pos: mapRealPosition(r.position) || "SF",
      gp: Number(r.gp) || 0,
      ppg: perGame(r.ppg, r.gp),
      rpg: perGame(r.rpg, r.gp),
      apg: perGame(r.apg, r.gp),
      class: realClassForName(r.player, year, r.startSeason) || "SO",
    }))
    .filter((r) => r.gp >= 5 && r.ppg + r.rpg + r.apg > 0);
  if (!mapped.length) return null;
  mapped.sort((a, b) => (b.ppg + b.rpg * 0.75 + b.apg * 0.85) - (a.ppg + a.rpg * 0.75 + a.apg * 0.85));
  return mapped[0];
}

// Fallback star line derived from a team's power when no real data exists.
function synthStarLine(power) {
  const t = clamp(((power || 50) - 38) / 40, 0, 1);
  return {
    name: fullName(), pos: pick(POSITIONS),
    ppg: +(9 + t * 13 + rand(-1, 2)).toFixed(1),
    rpg: +(3 + t * 5 + rand(-0.5, 1)).toFixed(1),
    apg: +(1.5 + t * 3 + rand(-0.3, 0.6)).toFixed(1),
    class: pick(CLASS_ORDER),
  };
}

// End-of-season national + conference honors. The user's players are judged on
// their simulated season line; every other program is represented by its best
// real player (or a synthesized star), scored with a national-rank bonus so a
// star on a top-10 team edges out a stat-stuffer on a bad one.
function computeAwards(state, rankById, ranked, powerById) {
  const year = state.year;
  const userTeam = TEAM_MAP[state.teamId];
  const userConf = userTeam.conf;
  const cands = [];

  state.roster.forEach((p) => {
    if ((p.season.gp || 0) < 3) return;
    const ppg = perGame(p.season.pts, p.season.gp);
    const rpg = perGame(p.season.reb, p.season.gp);
    const apg = perGame(p.season.ast, p.season.gp);
    cands.push({
      id: p.id, name: p.name, teamId: state.teamId, teamName: userTeam.name,
      pos: p.pos, class: p.class, ppg, rpg, apg, isUser: true,
      rank: rankById[state.teamId], score: awardScore(ppg, rpg, apg, rankById[state.teamId]),
    });
  });

  const nationalTeams = ranked.slice(0, 60).map((r) => r.team);
  const confMates = TEAMS.filter((t) => t.conf === userConf && t.id !== state.teamId);
  const pool = [...new Map([...nationalTeams, ...confMates].map((t) => [t.id, t])).values()]
    .filter((t) => t.id !== state.teamId);
  pool.forEach((t) => {
    const line = bestRealLine(t, year) || synthStarLine(powerById[t.id]);
    cands.push({
      id: "x-" + t.id, name: line.name, teamId: t.id, teamName: t.name,
      pos: line.pos, class: line.class, ppg: line.ppg, rpg: line.rpg, apg: line.apg,
      isUser: false, rank: rankById[t.id], score: awardScore(line.ppg, line.rpg, line.apg, rankById[t.id]),
    });
  });

  cands.sort((a, b) => b.score - a.score);
  const allAmerica = cands.slice(0, 5);
  const poy = allAmerica[0] || null;
  const allFreshman = cands.filter((c) => c.class === "FR").slice(0, 5);
  const allConference = cands
    .filter((c) => TEAM_MAP[c.teamId] && TEAM_MAP[c.teamId].conf === userConf)
    .slice(0, 5);

  const userHonors = [];
  state.roster.forEach((p) => {
    const honors = [];
    if (poy && poy.id === p.id) honors.push("National Player of the Year");
    else if (allAmerica.find((c) => c.id === p.id)) honors.push("All-America");
    if (allConference.find((c) => c.id === p.id)) honors.push(`All-${userConf}`);
    if (allFreshman.find((c) => c.id === p.id)) honors.push("All-Freshman");
    if (honors.length) userHonors.push({ name: p.name, pos: p.pos, honors });
  });

  return {
    year, userConf,
    poy: poy ? { name: poy.name, teamName: poy.teamName, pos: poy.pos, isUser: poy.isUser } : null,
    allAmerica: allAmerica.map((c) => ({ name: c.name, teamName: c.teamName, pos: c.pos, ppg: c.ppg, rpg: c.rpg, apg: c.apg, isUser: c.isUser })),
    allFreshman: allFreshman.map((c) => ({ name: c.name, teamName: c.teamName, pos: c.pos, isUser: c.isUser })),
    allConference: allConference.map((c) => ({ name: c.name, teamName: c.teamName, pos: c.pos, isUser: c.isUser })),
    userHonors,
  };
}

/* =========================================================================
   NBA DRAFT / EARLY DEPARTURES
   ========================================================================= */
// Hard eligibility floor to declare early for the NBA draft, by class. A player
// below the floor for their class cannot leave early at all.
const EARLY_DEPARTURE_MIN = { FR: 75, SO: 80, JR: 83 };

// The three pitches a coach can use to persuade a declared player to return.
// Exactly one is correct for each player (assigned at random when they declare).
const PERSUADE_PITCHES = [
  "Develop more before you leave and we can get you drafted higher",
  "You need to finish your degree.",
  "Scouts have told us you won't be drafted",
];

// Decide which underclassmen declare for the draft this offseason. Only players
// at/above their class's overall floor are eligible; among those, better players
// are likelier to go. Each declaration carries a randomly-assigned correct pitch
// and its persuasion state so the coach gets one attempt to talk them back.
function decideEarlyDeclarations(roster) {
  const out = [];
  roster.forEach((p) => {
    const min = EARLY_DEPARTURE_MIN[p.class];
    if (min == null) return;              // seniors / others can't leave early
    if ((p.overall || 0) < min) return;   // below the floor — ineligible
    const o = p.overall;
    let chance = o >= 90 ? 0.9 : o >= 86 ? 0.65 : o >= 83 ? 0.45 : 0.3;
    if (p.class === "JR") chance += 0.08;
    if (Math.random() < chance) {
      out.push({
        id: p.id, name: p.name, pos: p.pos, class: p.class, overall: o,
        correctPitch: randInt(0, PERSUADE_PITCHES.length - 1),
        attempted: false, kept: false, pitch: null,
      });
    }
  });
  return out;
}

function draftBoard(early, seniors) {
  return [...early, ...seniors.filter((p) => p.overall >= 80)]
    .sort((a, b) => b.overall - a.overall)
    .map((p, i) => ({ name: p.name, pos: p.pos, overall: p.overall, class: p.class, pick: i + 1, early: p.class !== "SR" }));
}

/* =========================================================================
   COACH CAREER + REPUTATION
   ========================================================================= */
const EMPTY_COACH = { wins: 0, losses: 0, seasons: 0, tourneyApps: 0, confTourneyTitles: 0, finalFours: 0, natTitles: 0, jobSecurity: 60 };
const JOB_REP_REQ = { 5: 120, 4: 70, 3: 35, 2: 12, 1: 0 };

/* =========================================================================
   SEASON EXPECTATIONS + HOT SEAT
   The athletic director sets a bar each season based on the program's current
   (fluid) prestige. Beating it builds job security; falling short erodes it, and
   a coach who bottoms out gets shown the door.
   ========================================================================= */
function seasonExpectation(prestige) {
  const p = Math.round(prestige || 2);
  if (p >= 5) return { label: "Reach the Final Four", winTarget: 26, psGoal: "Final Four", tier: 5 };
  if (p === 4) return { label: "Win 24 and make a deep tournament run", winTarget: 24, psGoal: "NCAA Tournament", tier: 4 };
  if (p === 3) return { label: "Make the NCAA Tournament", winTarget: 20, psGoal: "NCAA Tournament", tier: 3 };
  if (p === 2) return { label: "Finish with a winning record", winTarget: 17, psGoal: null, tier: 2 };
  return { label: "Show progress — win 12 games", winTarget: 12, psGoal: null, tier: 1 };
}

// Rank a postseason finish so results can be compared to a goal.
function psValue(s) {
  if (s === "National Champions") return 6;
  if (s === "Runner-up") return 5;
  if (s === "Final Four") return 4;
  if (s === "Elite Eight") return 3;
  if (s === "Sweet 16") return 2;
  if (s === "NCAA Tournament") return 1;
  return 0;
}

// How the season measured up: a job-security swing and whether the bar was met.
function evaluateSeason(exp, record, psSummary) {
  const psv = psValue(psSummary);
  const goalv = exp.psGoal ? psValue(exp.psGoal) : 0;
  let sec = clamp(record.w - exp.winTarget, -12, 12) * 1.4 + (psv - goalv) * 6;
  if (psSummary === "National Champions") sec += 20;
  const met = record.w >= exp.winTarget && psv >= goalv;
  return { securityDelta: Math.round(sec), met, winMargin: record.w - exp.winTarget };
}

function hotSeatTier(sec) {
  if (sec >= 75) return { label: "Untouchable", color: C.green };
  if (sec >= 45) return { label: "Secure", color: C.green };
  if (sec >= 25) return { label: "Warm Seat", color: C.gold };
  if (sec >= 12) return { label: "Hot Seat", color: C.wood };
  return { label: "Win or Be Fired", color: C.red };
}

function reputationOf(coach) {
  if (!coach) return 0;
  return Math.round(
    coach.seasons * 3 + coach.wins * 0.15 + coach.tourneyApps * 5 +
    coach.confTourneyTitles * 9 + coach.finalFours * 14 + coach.natTitles * 30
  );
}

function reputationTier(rep) {
  if (rep >= 120) return "Legend";
  if (rep >= 70) return "Elite";
  if (rep >= 35) return "Established";
  if (rep >= 12) return "Rising";
  return "Up-and-comer";
}

function finalizeCoachSeason(coach, record, postseason, teamId) {
  const c = coach ? { ...coach } : { ...EMPTY_COACH };
  c.wins += record.w; c.losses += record.l; c.seasons += 1;
  const summ = postseasonSummary(postseason, teamId);
  const conf = TEAM_MAP[teamId]?.conf;
  const wonConf = !!(postseason && postseason.confChampions && conf && postseason.confChampions[conf] === teamId);
  if (wonConf) c.confTourneyTitles += 1;
  if (summ === "National Champions") { c.natTitles += 1; c.finalFours += 1; c.tourneyApps += 1; }
  else if (summ === "Runner-up" || summ === "Final Four") { c.finalFours += 1; c.tourneyApps += 1; }
  else if (summ === "NCAA Tournament") c.tourneyApps += 1;
  else if (wonConf) c.tourneyApps += 1;
  return c;
}

/* =========================================================================
   BRACKETOLOGY / RIVALRIES / ROSTER NEEDS
   ========================================================================= */
function projectedSeed(rank) {
  if (!rank || rank > 68) return null;
  return { seed: clamp(Math.ceil(rank / 4), 1, 16), inField: rank <= 64 };
}

// Rivals = the two highest-prestige other programs in your conference.
function rivalTeamIds(teamId) {
  const t = TEAM_MAP[teamId];
  if (!t) return new Set();
  const mates = TEAMS.filter((x) => x.conf === t.conf && x.id !== teamId)
    .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));
  return new Set(mates.slice(0, 2).map((x) => x.id));
}

// Positions with at most one returning (non-senior) player — where next year's
// class is thinnest.
function positionNeeds(roster) {
  const future = Object.fromEntries(POSITIONS.map((p) => [p, 0]));
  roster.forEach((p) => { if (p.class !== "SR") future[p.pos] = (future[p.pos] || 0) + 1; });
  return POSITIONS.filter((p) => future[p] <= 1);
}

/* =========================================================================
   PERSISTENCE  (multiple save slots)
   ========================================================================= */
const SAVE_SLOTS = [1, 2, 3];
const slotKey = (slot) => `cbb-dynasty-save-${slot}`;
const LEGACY_SAVE_KEY = "cbb-dynasty-save";

async function saveDynasty(state) {
  const slot = state.slot || 1;
  try {
    await window.storage.set(slotKey(slot), JSON.stringify(state), false);
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}
async function loadSlot(slot) {
  try {
    const res = await window.storage.get(slotKey(slot), false);
    if (res) return JSON.parse(res.value);
    // one-time migration of the pre-slots save into slot 1
    if (slot === 1) {
      const legacy = await window.storage.get(LEGACY_SAVE_KEY, false);
      if (legacy) return { ...JSON.parse(legacy.value), slot: 1 };
    }
    return null;
  } catch (e) {
    return null;
  }
}
async function loadAllSlots() {
  const out = {};
  for (const s of SAVE_SLOTS) out[s] = await loadSlot(s);
  return out;
}
async function deleteSlot(slot) {
  try { await window.storage.delete(slotKey(slot), false); } catch (e) {}
  if (slot === 1) { try { await window.storage.delete(LEGACY_SAVE_KEY, false); } catch (e) {} }
}

/* =========================================================================
   UI PRIMITIVES
   ========================================================================= */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
      .cbb-root { font-family: 'Inter', system-ui, sans-serif; }
      .cbb-num { font-family: 'Oswald', system-ui, sans-serif; letter-spacing: 0.01em; }
      .cbb-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .cbb-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 0; }
      .cbb-scroll::-webkit-scrollbar-track { background: transparent; }
      .cbb-row:hover { background: ${C.panelAlt}; }
      .cbb-btn { transition: transform .08s ease, background .15s ease; }
      .cbb-btn:active { transform: scale(0.97); }
      @keyframes cbbSlideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes cbbFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cbbScorePop { 0% { transform: scale(1); } 35% { transform: scale(1.5); color: ${C.gold}; } 100% { transform: scale(1); } }
      @keyframes cbbWinPulse { 0% { background: rgba(216,168,58,0.45); } 100% { background: transparent; } }
      @keyframes cbbCrownPop { 0% { opacity: 0; transform: scale(0.6) rotate(-8deg); } 60% { transform: scale(1.15) rotate(3deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
      .cbb-slide-in { animation: cbbSlideIn .38s cubic-bezier(.2,.8,.3,1) both; }
      .cbb-score-pop { display: inline-block; animation: cbbScorePop .6s ease both; }
      .cbb-win-pulse { animation: cbbWinPulse 1.1s ease-out both; }
      .cbb-crown-pop { animation: cbbCrownPop .6s cubic-bezier(.2,.9,.3,1.4) both; }
    `}</style>
  );
}

function StarRow({ stars }) {
  if (!stars) return <span className="cbb-num" style={{ color: C.dimmer, fontSize: 12 }}>NR</span>;
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} fill={i < stars ? C.gold : "transparent"} color={i < stars ? C.gold : C.dimmer} />
      ))}
    </span>
  );
}

function Panel({ children, style, className }) {
  return (
    <div className={className} style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}>
      {children}
    </div>
  );
}

/* =========================================================================
   TEAM SELECT SCREEN
   ========================================================================= */
function TeamSelect({ onPick }) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState(FIRST_YEAR);
  const filtered = TEAMS.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));

  return (
    <div className="cbb-root cbb-scroll" style={{ minHeight: "100vh", background: C.bg, color: C.cream, padding: "40px 24px", overflowY: "auto" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ borderBottom: `2px solid ${C.wood}`, paddingBottom: 18, marginBottom: 28 }}>
          <div className="cbb-num" style={{ fontSize: 13, letterSpacing: "0.14em", color: C.wood, fontWeight: 600 }}>DYNASTY MODE · TIP-OFF {seasonLabel(year)}</div>
          <h1 className="cbb-num" style={{ fontSize: 40, fontWeight: 700, margin: "6px 0 8px" }}>Pick your program.</h1>
          <p style={{ color: C.dim, fontSize: 15, maxWidth: 620 }}>
            Choose your starting season, then build the roster, sign your classes, and coach every
            season forward from there — your save carries the program year after year.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>STARTING SEASON</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVAILABLE_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className="cbb-btn"
                style={{
                  cursor: "pointer", padding: "7px 12px", fontSize: 13, fontWeight: 600,
                  background: y === year ? C.wood : C.panel,
                  border: `1px solid ${y === year ? C.wood : C.line}`,
                  color: y === year ? "#1a1206" : C.cream,
                }}
              >
                {seasonLabel(y)}
              </button>
            ))}
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search programs…"
          style={{ width: "100%", background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "10px 14px", fontSize: 14, marginBottom: 20, outline: "none" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t, year)}
              className="cbb-btn"
              style={{
                textAlign: "left", cursor: "pointer", padding: "16px 14px",
                background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${t.primary}`,
                color: C.cream, display: "flex", flexDirection: "column", gap: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: C.dim }}>{t.conf}</div>
              <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: 14, height: 4, background: i < t.prestige ? C.wood : C.line }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN DYNASTY APP
   ========================================================================= */
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "roster", label: "Roster", icon: Users },
  { id: "depth", label: "Depth Chart", icon: ListOrdered },
  { id: "recruiting", label: "Recruiting", icon: Search },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "standings", label: "Standings", icon: Trophy },
  { id: "rankings", label: "Rankings", icon: Award },
  { id: "leaderboard", label: "Leaders", icon: Medal },
  { id: "postseason", label: "Postseason", icon: Crown },
  { id: "offseason", label: "Offseason", icon: GraduationCap },
  { id: "program", label: "Program", icon: Landmark },
];

function DynastyApp({ initial, onExit }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [viewTeamId, setViewTeamId] = useState(null);
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [playerViewId, setPlayerViewId] = useState(null);
  const [boxViewId, setBoxViewId] = useState(null);
  const [recap, setRecap] = useState(null);
  const [livePlay, setLivePlay] = useState(null);
  const [visit, setVisit] = useState(null); // { recruit, actionKey } for the interactive visit modal
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveDynasty(state); }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  // Keep the live team objects in sync with this dynasty's fluid prestige so
  // every consumer (power, recruiting, standings, stars) reads current values.
  // Runs during render (idempotent) so the first paint already reflects it,
  // and covers loaded saves as well as in-session drift.
  useMemo(() => { applyLivePrestige(state.prestigeById || baselinePrestigeById()); }, [state.prestigeById]);

  const team = TEAM_MAP[state.teamId];

  // Pegs the user's team onto the same power scale CPU teams use. Recomputed per
  // season: the real historical roster for (team, year) is mapped to that team's
  // real barthag strength, so a roster that matches history plays true to it and
  // only genuine roster changes (recruiting, progression, attrition) move it.
  const powerBaseline = useMemo(() => {
    const realRoster = buildInitialRoster(team, state.year);
    const realOverall = userTeamOverall(realRoster, defaultDepthChart(realRoster));
    const barthagPower = teamPowerRating(team, state.strengths, state.year, { noise: false });
    return { realOverall, barthagPower };
  }, [state.teamId, state.year, state.strengths]);

  // The Transfer Portal only exists during the offseason, so it appears as its
  // own tab (right after Recruiting) only while an offseason is active.
  const navTabs = useMemo(() => {
    if (!state.offseason) return TABS;
    const base = [...TABS];
    const idx = base.findIndex((t) => t.id === "recruiting");
    base.splice(idx + 1, 0, { id: "transfer-portal", label: "Transfer Portal", icon: Swords });
    return base;
  }, [state.offseason]);

  useEffect(() => {
    if (tab === "transfer-portal" && !state.offseason) setTab("recruiting");
  }, [tab, state.offseason]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const nextGame = state.schedule.find((g) => !g.played);
  const record = useMemo(() => {
    const w = state.schedule.filter((g) => g.played && g.result.win).length;
    const l = state.schedule.filter((g) => g.played && !g.result.win).length;
    return { w, l };
  }, [state.schedule]);

  // National rankings, recomputed as results change. Shared by the Rankings
  // tab, schedule/standings rank badges, and postseason seeding.
  const { rankById, ranked } = useMemo(() => {
    const powerById = powerTableFor(state.strengths, state.year);
    // The user's poll power is their real-team baseline plus whatever their built
    // roster adds or subtracts — on the SAME scale as every CPU team, so a real
    // roster ranks true to history and recruiting a great team lifts them from
    // there (rather than the raw OVR average, which over-ranked weak programs).
    powerById[state.teamId] = userGamePower(state.roster, state.depthChart, powerBaseline);
    const gamesPlayed = record.w + record.l;
    const recordById = accruedRecordTable(powerById, state.teamId, record, state.year, state.seasonSeed, gamesPlayed);
    return computeRankings(powerById, recordById, state.teamId, gamesPlayed);
  }, [state.strengths, state.year, state.teamId, record, state.roster, state.depthChart, powerBaseline, state.seasonSeed]);

  const reputation = reputationOf(state.coach);
  const leaders = useMemo(
    () => buildLeaderboard(state.year, state.teamId, state.roster),
    [state.year, state.teamId, state.roster]
  );
  const rivalIds = useMemo(() => rivalTeamIds(state.teamId), [state.teamId]);
  const needs = useMemo(() => positionNeeds(state.roster), [state.roster]);
  const bracketology = projectedSeed(rankById[state.teamId]);

  // Scholarship accounting drives recruiting: 13 total, minus scholarship
  // players returning next season (non-seniors) and anyone already committed
  // this cycle. When this hits zero the coach must cut a player to sign more.
  const scholarshipInfo = useMemo(() => {
    const returning = state.roster.filter((p) => p.scholarship && p.class !== "SR").length;
    const committed = state.incomingCommits.length + (state.offseason?.committedTransfers?.length || 0);
    const used = returning + committed;
    return { returning, committed, used, open: Math.max(0, SCHOLARSHIP_LIMIT - used) };
  }, [state.roster, state.incomingCommits, state.offseason]);

  // Shared finish path for both the instant sim and Coach Mode: applies a
  // { win, myScore, oppScore, boxByPlayer } result to season stats, injuries,
  // the schedule, recruiting cadence, and the rivalry ledger.
  function commitGameResult(result, opp, oppRank) {
    if (!nextGame) return;
    let roster = state.roster.map((p) => {
      const box = result.boxByPlayer[p.id];
      if (!box) return p;
      return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + box.pts, reb: p.season.reb + box.reb, ast: p.season.ast + box.ast } };
    });
    roster = tickInjuries(roster);
    const inj = maybeInjure(roster, rotationIdsOf(state.depthChart, roster));
    roster = inj.roster;
    const box = boxArray(result.boxByPlayer, state.roster);

    const schedule = state.schedule.map((g) => g.id === nextGame.id
      ? { ...g, played: true, result: { win: result.win, myScore: result.myScore, oppScore: result.oppScore, oppRank, box } }
      : g);
    const newWeekIndex = schedule.filter((g) => g.played).length + 1;
    const weeksElapsed = Math.max(0, newWeekIndex - state.recruitingWeekIndex);
    const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(state.recruitingBoard, state.recruitingWeekIndex, weeksElapsed, TOTAL_SEASON_WEEKS) : state.recruitingBoard;
    const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : state.recruitingPoints;

    // Head-to-head record vs conference rivals persists across seasons.
    let rivalryLedger = state.rivalryLedger || {};
    if (rivalIds.has(nextGame.oppId)) {
      const prev = rivalryLedger[nextGame.oppId] || { w: 0, l: 0 };
      rivalryLedger = { ...rivalryLedger, [nextGame.oppId]: { w: prev.w + (result.win ? 1 : 0), l: prev.l + (result.win ? 0 : 1) } };
    }

    setState((s) => ({ ...s, roster, schedule, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex, rivalryLedger }));

    const sig = result.win && oppRank && oppRank <= 25;
    let msg = result.win
      ? `Beat ${opp.name} ${result.myScore}-${result.oppScore}${sig ? ` — signature win over No. ${oppRank}!` : ""}`
      : `Lost to ${opp.name} ${result.oppScore}-${result.myScore}`;
    if (inj.injured) msg += ` ${inj.injured.name} injured (out ${inj.injured.games}).`;
    flash(msg);
  }

  function simOneGame() {
    if (!nextGame) return;
    const opp = TEAM_MAP[nextGame.oppId];
    const oppPower = teamPowerRating(opp, state.strengths, state.year);
    const hdc = healthyDepthChart(state.depthChart, state.roster);
    const mom = momentumMod(currentStreak(state.schedule));
    const result = simulateGame(state.roster, hdc, oppPower, mom, powerBaseline);
    commitGameResult(result, opp, rankById[nextGame.oppId] || null);
  }

  // Open the interactive Coach Mode game for the next matchup.
  function playOneGame() {
    if (!nextGame) return;
    const opp = TEAM_MAP[nextGame.oppId];
    const oppPower = teamPowerRating(opp, state.strengths, state.year);
    const hdc = healthyDepthChart(state.depthChart, state.roster);
    const mom = momentumMod(currentStreak(state.schedule));
    setLivePlay({ teamId: state.teamId, opp, oppId: nextGame.oppId, oppPower, oppRank: rankById[nextGame.oppId] || null, home: nextGame.home, momentum: mom, roster: state.roster, dc: hdc, powerBaseline });
  }

  function simToEndOfSeason() {
    let roster = state.roster.map((p) => ({ ...p }));
    const games = state.schedule.map((g) => ({ ...g }));
    let sigWins = 0;
    for (let idx = 0; idx < games.length; idx++) {
      const g = games[idx];
      if (g.played) continue;
      const opp = TEAM_MAP[g.oppId];
      const oppPower = teamPowerRating(opp, state.strengths, state.year);
      const mom = momentumMod(currentStreak(games.filter((x) => x.played)));
      const hdc = healthyDepthChart(state.depthChart, roster);
      const result = simulateGame(roster, hdc, oppPower, mom, powerBaseline);
      const oppRank = rankById[g.oppId] || null;
      roster = roster.map((p) => {
        const bx = result.boxByPlayer[p.id];
        if (!bx) return p;
        return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + bx.pts, reb: p.season.reb + bx.reb, ast: p.season.ast + bx.ast } };
      });
      roster = tickInjuries(roster);
      roster = maybeInjure(roster, rotationIdsOf(state.depthChart, roster)).roster;
      const box = boxArray(result.boxByPlayer, roster);
      g.played = true;
      g.result = { win: result.win, myScore: result.myScore, oppScore: result.oppScore, oppRank, box };
      if (result.win && oppRank && oppRank <= 25) sigWins += 1;
    }
    setState((s) => {
      const newWeekIndex = games.filter((g) => g.played).length + 1;
      const weeksElapsed = Math.max(0, newWeekIndex - s.recruitingWeekIndex);
      const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(s.recruitingBoard, s.recruitingWeekIndex, weeksElapsed, TOTAL_SEASON_WEEKS) : s.recruitingBoard;
      const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : s.recruitingPoints;
      return { ...s, roster, schedule: games, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex };
    });
    flash(`Simulated the rest of the season.${sigWins ? ` ${sigWins} signature win${sigWins > 1 ? "s" : ""}.` : ""}`);
  }

  // Sim only the remaining NON-conference games, stopping when conference play
  // begins. Lets a coach blow through the soft early slate and pick games back
  // up once the league schedule matters.
  function simThroughGames(filterFn, label) {
    let roster = state.roster.map((p) => ({ ...p }));
    const games = state.schedule.map((g) => ({ ...g }));
    let played = 0;
    for (let idx = 0; idx < games.length; idx++) {
      const g = games[idx];
      if (g.played || !filterFn(g)) continue;
      const opp = TEAM_MAP[g.oppId];
      const oppPower = teamPowerRating(opp, state.strengths, state.year);
      const mom = momentumMod(currentStreak(games.filter((x) => x.played)));
      const hdc = healthyDepthChart(state.depthChart, roster);
      const result = simulateGame(roster, hdc, oppPower, mom, powerBaseline);
      const oppRank = rankById[g.oppId] || null;
      roster = roster.map((p) => {
        const bx = result.boxByPlayer[p.id];
        if (!bx) return p;
        return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + bx.pts, reb: p.season.reb + bx.reb, ast: p.season.ast + bx.ast } };
      });
      roster = tickInjuries(roster);
      roster = maybeInjure(roster, rotationIdsOf(state.depthChart, roster)).roster;
      const box = boxArray(result.boxByPlayer, roster);
      g.played = true;
      g.result = { win: result.win, myScore: result.myScore, oppScore: result.oppScore, oppRank, box };
      played += 1;
    }
    setState((s) => {
      const newWeekIndex = games.filter((g) => g.played).length + 1;
      const weeksElapsed = Math.max(0, newWeekIndex - s.recruitingWeekIndex);
      const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(s.recruitingBoard, s.recruitingWeekIndex, weeksElapsed, TOTAL_SEASON_WEEKS) : s.recruitingBoard;
      const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : s.recruitingPoints;
      return { ...s, roster, schedule: games, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex };
    });
    flash(played ? label : "No games left to sim in that window.");
  }

  function simToConferencePlay() {
    simThroughGames((g) => !g.conf, "Simulated through non-conference play.");
  }

  function enterOffseason() {
    if (!state.postseason || state.postseason.phase !== "done" || state.offseason) return;
    const nextYear = state.year + 1;
    const transferBoard = seedInterest(genTransferBoard(nextYear), team);
    const draftDeclarations = decideEarlyDeclarations(state.roster);
    setState((s) => ({
      ...s,
      offseason: {
        week: 1,
        transferBoard,
        committedTransfers: [],
        draftDeclarations,
        points: weeklyRecruitingBudget(team),
        scheduleDraft: genSchedule(team, nextYear),
        done: false,
        devPoints: DEV_POINTS_PER_OFFSEASON,
        devSpent: {},
      },
    }));
    setTab("offseason");
    flash("Offseason underway — work the transfer portal, set your schedule, or take a new job.");
  }

  function doTransferAction(recruit, actionKey) {
    const os = state.offseason;
    if (!os) return;
    if (!canTakeAction(recruit, actionKey, os.points, os.week, team)) return;
    const cost = actionCostFor(actionKey, recruit, team);
    const updated = applyRecruitAction(recruit, actionKey, os.week);
    setState((s) => ({
      ...s,
      offseason: {
        ...s.offseason,
        points: s.offseason.points - cost,
        transferBoard: s.offseason.transferBoard.map((r) => (r.id === recruit.id ? updated : r)),
      },
    }));
  }

  // One persuasion attempt per declared player: pick a pitch, and if it's the
  // (randomly assigned) correct one, the player withdraws and stays.
  function persuadePlayer(playerId, pitchIndex) {
    const os = state.offseason;
    if (!os || !os.draftDeclarations) return;
    const decl = os.draftDeclarations.find((d) => d.id === playerId);
    if (!decl || decl.attempted) return;
    const kept = pitchIndex === decl.correctPitch;
    setState((s) => ({
      ...s,
      offseason: {
        ...s.offseason,
        draftDeclarations: s.offseason.draftDeclarations.map((d) =>
          d.id === playerId ? { ...d, attempted: true, kept, pitch: pitchIndex } : d),
      },
    }));
    flash(kept
      ? `${decl.name} is withdrawing from the draft and returning!`
      : `${decl.name} thanked you but is staying in the draft.`);
  }

  function attemptSignTransfer(recruit) {
    const os = state.offseason;
    if (!os) return;
    if (scholarshipInfo.open <= 0) { flash("No scholarships available — cut a player to open a spot."); return; }
    const week = os.week;
    const status = signAttemptStatus(recruit, week);
    if (!status.ok) {
      if (status.reason === "offer") flash("Extend a scholarship offer before you can sign a transfer.");
      else if (status.reason === "odds") flash(`${recruit.name} must be above 50% to sign — you're at ${Math.round(status.chance * 100)}%. Keep working them.`);
      else if (status.reason === "max") flash(`You've used both sign attempts on ${recruit.name} this cycle.`);
      else if (status.reason === "week") flash(`You can only make one sign attempt per week — try ${recruit.name} again next week.`);
      return;
    }
    const chance = status.chance;
    const attempts = status.attempts + 1;
    if (Math.random() < chance) {
      const poach = recruit.real ? { name: recruit.name, teamId: findOurTeamByRealName(recruit.originalTeam)?.id || null } : null;
      setState((s) => ({
        ...s,
        poachedPlayers: poach ? [...(s.poachedPlayers || []), poach] : (s.poachedPlayers || []),
        offseason: {
          ...s.offseason,
          transferBoard: s.offseason.transferBoard.map((r) => (r.id === recruit.id ? { ...r, committedTo: s.teamId, signAttempts: attempts, signAttemptWeek: week } : r)),
          committedTransfers: [...s.offseason.committedTransfers, recruit.id],
        },
      }));
      flash(`${recruit.name} is transferring in! (won at ${Math.round(chance * 100)}% odds)`);
    } else {
      const left = MAX_SIGN_ATTEMPTS - attempts;
      setState((s) => ({
        ...s,
        offseason: {
          ...s.offseason,
          transferBoard: s.offseason.transferBoard.map((r) => (r.id === recruit.id ? { ...r, rivalPressure: clamp(r.rivalPressure + 10, 0, 95), signAttempts: attempts, signAttemptWeek: week } : r)),
        },
      }));
      flash(`${recruit.name} isn't ready to commit yet. (${Math.round(chance * 100)}% odds — ${left} attempt${left === 1 ? "" : "s"} left)`);
    }
  }

  function advanceOffseasonWeek() {
    const os = state.offseason;
    if (!os || os.done) return;
    const nextWeek = os.week + 1;
    const closing = nextWeek > OFFSEASON_WEEKS;
    const board = tickRecruitingWeek(os.transferBoard, nextWeek, OFFSEASON_WEEKS + 1);
    setState((s) => ({
      ...s,
      offseason: { ...s.offseason, week: nextWeek, transferBoard: board, points: weeklyRecruitingBudget(team), done: closing },
    }));
    flash(closing ? "The transfer portal has closed — begin the next season." : `Offseason week ${nextWeek} of ${OFFSEASON_WEEKS}.`);
  }

  function editDraftGame(gameId, changes) {
    setState((s) => {
      let c = changes;
      if ("oppId" in changes && !nonConfOppAllowed(s.offseason.scheduleDraft, gameId, changes.oppId, team.conf)) {
        c = { ...changes };
        delete c.oppId;
      }
      if (Object.keys(c).length === 0) return s;
      return {
        ...s,
        offseason: {
          ...s.offseason,
          scheduleDraft: s.offseason.scheduleDraft.map((g) => (g.id === gameId && !g.conf && !g.played ? { ...g, ...c } : g)),
        },
      };
    });
  }

  function startPostseason() {
    if (!seasonOver || state.postseason) return;
    setState((s) => ({
      ...s,
      postseason: {
        phase: "conf",
        confBrackets: buildConfBrackets(rankById),
        confChampions: {},
        madness: null,
        champion: null,
        seedRankById: rankById,
      },
    }));
    setTab("postseason");
    flash("Conference tournaments are underway.");
  }

  // Advances every live bracket one round. The user's games are simulated with
  // their real roster; box scores accrue to season stats just like the regular
  // season. Everything else auto-resolves by power rating.
  function simPostseasonRound() {
    const ps = state.postseason;
    if (!ps || ps.phase === "done") return;

    const ctx = {
      powerById: powerTableFor(state.strengths, state.year),
      userTeamId: state.teamId,
      roster: state.roster,
      depthChart: state.depthChart,
      strengths: state.strengths,
      year: state.year,
      powerBaseline,
    };
    let userBox = null;
    const captureBox = (bracket) => {
      if (bracket && bracket._freshUserBox) userBox = bracket._freshUserBox;
    };

    setState((s) => {
      const next = { ...s.postseason };

      if (next.phase === "conf") {
        const confBrackets = { ...next.confBrackets };
        const confChampions = { ...next.confChampions };
        for (const conf of CONF_LIST) {
          const before = confBrackets[conf];
          if (before.done) continue;
          const after = advanceBracketRound(before, ctx);
          captureBox(after);
          confBrackets[conf] = after;
          if (after.done && after.champion) confChampions[conf] = after.champion;
        }
        next.confBrackets = confBrackets;
        next.confChampions = confChampions;
        const allDone = CONF_LIST.every((c) => confBrackets[c].done);
        if (allDone) {
          next.phase = "madness";
          next.madness = buildMadness(confChampions, next.seedRankById);
        }
      } else if (next.phase === "madness") {
        const md = { ...next.madness };
        if (!regionsComplete(md)) {
          md.regions = md.regions.map((r) => {
            if (r.bracket.done) return r;
            const after = advanceBracketRound(r.bracket, ctx);
            captureBox(after);
            return { ...r, bracket: after };
          });
          if (regionsComplete(md) && !md.finalFour) {
            // Region champs meet in the Final Four; pair region 0v1, 2v3.
            const champs = md.regions.map((r) => r.bracket.champion);
            md.finalFour = {
              seeds: champs,
              rounds: [[
                { a: champs[0], b: champs[1], winner: null, scoreA: null, scoreB: null, bye: false },
                { a: champs[2], b: champs[3], winner: null, scoreA: null, scoreB: null, bye: false },
              ]],
              champion: null, done: false,
            };
          }
        } else if (md.finalFour && !md.finalFour.done) {
          const after = advanceBracketRound(md.finalFour, ctx);
          captureBox(after);
          md.finalFour = after;
          if (after.done) { next.champion = after.champion; next.phase = "done"; }
        }
        next.madness = md;
      }

      // Apply the user's postseason box score to season totals if they played.
      let roster = s.roster;
      if (userBox) {
        roster = s.roster.map((p) => {
          const box = userBox[p.id];
          if (!box) return p;
          return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + box.pts, reb: p.season.reb + box.reb, ast: p.season.ast + box.ast } };
        });
      }
      return { ...s, roster, postseason: next };
    });
  }

  // Open Coach Mode for the user's own postseason game. The rest of the round
  // still auto-resolves when they hit "Sim Rest of Round".
  function playUserPostseasonGame() {
    const loc = findUserPendingMatchup(state.postseason, state.teamId);
    if (!loc) return;
    const m = loc.matchup;
    const oppId = m.a === state.teamId ? m.b : m.a;
    const opp = TEAM_MAP[oppId];
    const oppPower = teamPowerRating(opp, state.strengths, state.year);
    const hdc = healthyDepthChart(state.depthChart, state.roster);
    setLivePlay({
      teamId: state.teamId, opp, oppId, oppPower,
      oppRank: rankById[oppId] || null, home: true, momentum: 0,
      roster: state.roster, dc: hdc, powerBaseline,
      isPostseason: true, loc,
    });
  }

  // Write a live-played postseason result into its exact matchup and credit the
  // box score to season stats immediately (flagged so the round-sim won't
  // double-count it). Other games in the round resolve on "Sim Rest of Round".
  function commitPostseasonUserGame(result, lp) {
    const loc = lp.loc;
    const userTeamId = state.teamId;
    const applyToBracket = (bracket) => {
      const rounds = bracket.rounds.map((r) => r.map((mm) => ({ ...mm })));
      const m = rounds[loc.roundIndex][loc.matchIndex];
      const winner = result.win ? userTeamId : lp.oppId;
      rounds[loc.roundIndex][loc.matchIndex] = {
        ...m, winner,
        scoreA: m.a === userTeamId ? result.myScore : result.oppScore,
        scoreB: m.b === userTeamId ? result.myScore : result.oppScore,
        userBox: result.boxByPlayer, userBoxApplied: true,
      };
      return { ...bracket, rounds };
    };
    setState((s) => {
      const ps = { ...s.postseason };
      if (loc.where === "conf") {
        ps.confBrackets = { ...ps.confBrackets, [loc.conf]: applyToBracket(ps.confBrackets[loc.conf]) };
      } else if (loc.where === "region") {
        ps.madness = { ...ps.madness, regions: ps.madness.regions.map((r, i) => i === loc.regionIndex ? { ...r, bracket: applyToBracket(r.bracket) } : r) };
      } else if (loc.where === "finalFour") {
        ps.madness = { ...ps.madness, finalFour: applyToBracket(ps.madness.finalFour) };
      }
      const roster = s.roster.map((p) => {
        const box = result.boxByPlayer[p.id];
        if (!box) return p;
        return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + box.pts, reb: p.season.reb + box.reb, ast: p.season.ast + box.ast } };
      });
      return { ...s, roster, postseason: ps };
    });
    flash(result.win
      ? `Advanced past ${lp.opp.name} ${result.myScore}-${result.oppScore}!`
      : `Eliminated by ${lp.opp.name} ${result.oppScore}-${result.myScore}.`);
  }

  function doRecruitAction(recruit, actionKey) {
    const week = state.recruitingWeekIndex;
    if (!canTakeAction(recruit, actionKey, state.recruitingPoints, week, team)) return;
    // Visits aren't a one-click point spend anymore — they open an interactive
    // trip where the coach's pitch choices decide how much interest is gained.
    if (actionKey === "VISIT" || actionKey === "HOME") { setVisit({ recruit, actionKey }); return; }
    const cost = actionCostFor(actionKey, recruit, team);
    const updated = applyRecruitAction(recruit, actionKey, week);
    setState((s) => {
      // Extending an offer commits you to the prospect, so pin them as a target
      // automatically — no separate click to track who you've offered.
      const targets = s.recruitTargets || [];
      const nextTargets =
        actionKey === "OFFER" && !targets.includes(recruit.id) ? [...targets, recruit.id] : targets;
      return {
        ...s,
        recruitingPoints: s.recruitingPoints - cost,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? updated : r)),
        recruitTargets: nextTargets,
      };
    });
  }

  // Apply the outcome of an interactive visit: deduct its distance-priced cost,
  // add the interest the coach's choices earned, and mark the visit used.
  function finishVisit(totalGain) {
    if (!visit) return;
    const { recruit, actionKey } = visit;
    const week = state.recruitingWeekIndex;
    const cost = actionCostFor(actionKey, recruit, team);
    setState((s) => {
      const r0 = s.recruitingBoard.find((r) => r.id === recruit.id);
      if (!r0 || r0.committedTo) return s;
      const next = { ...r0, interest: clamp(r0.interest + totalGain, 0, 100) };
      if (actionKey === "VISIT") next.visitsUsed = (next.visitsUsed || 0) + 1;
      if (actionKey === "HOME") { next.homeVisitsUsed = (next.homeVisitsUsed || 0) + 1; next.homeVisitWeek = week; }
      return {
        ...s,
        recruitingPoints: s.recruitingPoints - cost,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? next : r)),
      };
    });
    setVisit(null);
  }

  function toggleTarget(recruitId) {
    setState((s) => {
      const cur = s.recruitTargets || [];
      const has = cur.includes(recruitId);
      return { ...s, recruitTargets: has ? cur.filter((id) => id !== recruitId) : [...cur, recruitId] };
    });
  }

  function attemptSign(recruit) {
    if (scholarshipInfo.open <= 0) { flash("No scholarships available — cut a player in the offseason to open a spot."); return; }
    const week = state.recruitingWeekIndex;
    const status = signAttemptStatus(recruit, week);
    if (!status.ok) {
      if (status.reason === "offer") flash("Extend a scholarship offer before you can sign them.");
      else if (status.reason === "odds") flash(`${recruit.name} must be above 50% to sign — you're at ${Math.round(status.chance * 100)}%. Keep working them.`);
      else if (status.reason === "max") flash(`You've used both sign attempts on ${recruit.name} this cycle.`);
      else if (status.reason === "week") flash(`You can only make one sign attempt per week — try ${recruit.name} again next week.`);
      return;
    }
    const chance = status.chance;
    const attempts = status.attempts + 1;
    const success = Math.random() < chance;
    if (success) {
      const poach = recruit.real ? { name: recruit.name, teamId: findOurTeamByRealName(recruit.originalTeam)?.id || null } : null;
      setState((s) => ({
        ...s,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? { ...r, committedTo: s.teamId, signAttempts: attempts, signAttemptWeek: week } : r)),
        incomingCommits: [...s.incomingCommits, recruit.id],
        poachedPlayers: poach ? [...(s.poachedPlayers || []), poach] : (s.poachedPlayers || []),
      }));
      flash(`${recruit.name} has committed! (won at ${Math.round(chance * 100)}% odds)`);
    } else {
      const left = MAX_SIGN_ATTEMPTS - attempts;
      setState((s) => ({
        ...s,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? { ...r, rivalPressure: clamp(r.rivalPressure + 10, 0, 95), signAttempts: attempts, signAttemptWeek: week } : r)),
      }));
      flash(`${recruit.name} isn't ready to commit yet. (${Math.round(chance * 100)}% odds — ${left} attempt${left === 1 ? "" : "s"} left)`);
    }
  }

  function moveInDepthChart(pos, index, dir) {
    setState((s) => {
      const arr = [...s.depthChart[pos]];
      const swapWith = index + dir;
      if (swapWith < 0 || swapWith >= arr.length) return s;
      [arr[index], arr[swapWith]] = [arr[swapWith], arr[index]];
      return { ...s, depthChart: { ...s.depthChart, [pos]: arr } };
    });
  }

  // Slot a player into any position group (removing them from wherever they
  // were), so a point guard can be listed at the two, the three, and so on.
  function assignPosition(playerId, toPos) {
    setState((s) => {
      const dc = {};
      POSITIONS.forEach((p) => { dc[p] = s.depthChart[p].filter((id) => id !== playerId); });
      dc[toPos] = [...dc[toPos], playerId];
      return { ...s, depthChart: dc };
    });
  }

  function removeFromDepth(playerId) {
    setState((s) => {
      const dc = {};
      POSITIONS.forEach((p) => { dc[p] = s.depthChart[p].filter((id) => id !== playerId); });
      return { ...s, depthChart: dc };
    });
  }

  // Offseason roster cut: drop a player entirely, pull them from the depth
  // chart, refund any development points spent on them this offseason, and
  // recompute the scholarship split (opening a spot for recruiting).
  function cutPlayer(playerId) {
    setState((s) => {
      const player = s.roster.find((p) => p.id === playerId);
      if (!player) return s;
      const roster = assignScholarships(s.roster.filter((p) => p.id !== playerId));
      const dc = {};
      POSITIONS.forEach((p) => { dc[p] = (s.depthChart[p] || []).filter((id) => id !== playerId); });
      let offseason = s.offseason;
      if (offseason && offseason.devSpent && offseason.devSpent[playerId]) {
        const refunded = Object.values(offseason.devSpent[playerId]).reduce((a, b) => a + b, 0);
        const devSpent = { ...offseason.devSpent };
        delete devSpent[playerId];
        offseason = { ...offseason, devPoints: (offseason.devPoints || 0) + refunded, devSpent };
      }
      return { ...s, roster, depthChart: dc, offseason };
    });
    flash("Player cut — a scholarship has opened up.");
  }

  // Spend (or refund) a development point on one attribute. Enforces the shared
  // pool, the per-attribute cap, and the 40-99 attribute range. Boosts are
  // recorded on the player so real players keep the gain after next year's
  // stat-based re-derivation.
  function adjustPlayerAttr(playerId, attr, delta) {
    setState((s) => {
      const os = s.offseason;
      if (!os) return s;
      const player = s.roster.find((p) => p.id === playerId);
      if (!player) return s;
      const spentMap = os.devSpent || {};
      const playerSpent = spentMap[playerId] || {};
      const already = playerSpent[attr] || 0;
      const cur = player.attrs[attr] ?? 40;
      if (delta > 0) {
        if ((os.devPoints || 0) <= 0 || already >= DEV_MAX_PER_ATTR || cur >= 99) return s;
      } else {
        if (already <= 0) return s;
      }
      const newAttrs = { ...player.attrs, [attr]: clamp(cur + delta, 40, 99) };
      const roster = s.roster.map((p) => p.id === playerId
        ? { ...p, attrs: newAttrs, overall: computeOverall(p.pos, newAttrs), boosts: { ...(p.boosts || {}), [attr]: ((p.boosts || {})[attr] || 0) + delta } }
        : p);
      const nextPlayerSpent = { ...playerSpent, [attr]: already + delta };
      const devSpent = { ...spentMap, [playerId]: nextPlayerSpent };
      return { ...s, roster, offseason: { ...os, devPoints: (os.devPoints || 0) - delta, devSpent } };
    });
  }

  function advanceYear() {
    const powerById = powerTableFor(state.strengths, state.year);
    const awards = computeAwards(state, rankById, ranked, powerById);
    // Fluid prestige: nudge the whole league from the season that just ended.
    const uGames = record.w + record.l;
    const uWinPct = uGames ? record.w / uGames : 0.5;
    const uRank = rankById[state.teamId];
    const uRankQ = uRank ? clamp(1 - (uRank - 1) / 363, 0, 1) : clamp((powerById[state.teamId] - 25) / 70, 0, 1);
    const nextPrestige = driftPrestige(
      state.prestigeById || baselinePrestigeById(), state.year, powerById, state.teamId,
      clamp(0.55 * uWinPct + 0.45 * uRankQ, 0, 1)
    );
    const os = state.offseason;
    // Early departures resolve from the offseason declarations (after any
    // persuasion). Players talked into staying are kept off the leaving list.
    const declarations = os && os.draftDeclarations
      ? os.draftDeclarations
      : decideEarlyDeclarations(state.roster);
    const leavingIds = new Set(declarations.filter((d) => !d.kept).map((d) => d.id));
    const early = state.roster.filter((p) => leavingIds.has(p.id));
    const seniors = state.roster.filter((p) => p.class === "SR");
    const draft = draftBoard(early, seniors);
    const coach = finalizeCoachSeason(state.coach, record, state.postseason, state.teamId);
    const earlyIds = leavingIds;

    const incomingFreshmen = state.incomingCommits
      .map((id) => state.recruitingBoard.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => recruitToPlayer(r, team));
    const incomingTransfers = os
      ? (os.committedTransfers || [])
          .map((id) => os.transferBoard.find((r) => r.id === id))
          .filter(Boolean)
          .map((r) => recruitToPlayer(r, team))
      : [];
    const incomingRecruits = [...incomingFreshmen, ...incomingTransfers];

    const newYear = state.year + 1;
    const surviving = state.roster.filter((p) => !earlyIds.has(p.id));
    const newRoster = progressRosterForNewYear(surviving, incomingRecruits, team, newYear);
    const newStrengths = genSeasonStrengths();
    const psSummary = postseasonSummary(state.postseason, state.teamId);

    // Hot seat: grade the season against the AD's bar, swing job security, and
    // set next season's expectation off the program's drifted prestige.
    const exp = state.expectation || seasonExpectation(team.prestige);
    const evalRes = evaluateSeason(exp, record, psSummary);
    const secBefore = state.coach?.jobSecurity ?? 60;
    const secAfter = clamp(secBefore + evalRes.securityDelta, 0, 100);
    coach.jobSecurity = secAfter;
    const nextExp = seasonExpectation(nextPrestige[state.teamId] ?? team.prestige);
    const fired = secAfter <= 8;

    // Prestige movement since last season, for trend indicators.
    const prevP = state.prestigeById || baselinePrestigeById();
    const prestigeTrendById = {};
    Object.keys(nextPrestige).forEach((id) => {
      const d = nextPrestige[id] - (prevP[id] ?? nextPrestige[id]);
      prestigeTrendById[id] = d > 0.02 ? 1 : d < -0.02 ? -1 : 0;
    });

    const recapData = {
      year: state.year, teamName: team.name,
      record: { ...record }, postseason: psSummary, awards, draft,
      early: early.map((p) => ({ name: p.name, pos: p.pos, class: p.class, overall: p.overall })),
      seniorCount: seniors.length,
      incomingCount: incomingRecruits.length,
      repBefore: reputationOf(state.coach), repAfter: reputationOf(coach),
    };

    setState({
      ...state,
      year: newYear,
      seasonSeed: (Math.random() * 0xffffffff) >>> 0,
      prestigeById: nextPrestige,
      roster: newRoster,
      depthChart: defaultDepthChart(newRoster),
      schedule: (os && os.scheduleDraft) ? os.scheduleDraft : genSchedule(team, newYear),
      recruitingBoard: seedInterest(genRecruitPool(newYear + 1), team),
      incomingCommits: [],
      recruitTargets: [],
      recruitingPoints: weeklyRecruitingBudget(team),
      recruitingWeekIndex: 1,
      strengths: newStrengths,
      postseason: null,
      offseason: null,
      coach,
      awardsHistory: [
        ...(state.awardsHistory || []),
        ...(awards.userHonors.length ? [{ year: state.year, teamName: team.name, honors: awards.userHonors }] : []),
      ],
      draftHistory: [
        ...(state.draftHistory || []),
        ...(draft.length ? [{ year: state.year, teamName: team.name, picks: draft }] : []),
      ],
      history: [...state.history, { year: state.year, wins: record.w, losses: record.l, teamId: state.teamId, postseason: psSummary, awards, draft }],
      expectation: nextExp,
      prestigeTrendById,
    });
    setRecap(recapData);
    if (fired) {
      setTimeout(() => {
        flash(`${team.name} has parted ways with you after missing expectations. Find a new job.`);
        setJobPickerOpen(true);
      }, 300);
    }
  }

  function changeJob(newTeam) {
    const coach = finalizeCoachSeason(state.coach, record, state.postseason, state.teamId);
    const powerById = powerTableFor(state.strengths, state.year);
    const awards = computeAwards(state, rankById, ranked, powerById);
    // Fluid prestige: the season you just finished at your old school still
    // counts, so drift the whole league before switching jobs.
    const uGames = record.w + record.l;
    const uWinPct = uGames ? record.w / uGames : 0.5;
    const uRank = rankById[state.teamId];
    const uRankQ = uRank ? clamp(1 - (uRank - 1) / 363, 0, 1) : clamp((powerById[state.teamId] - 25) / 70, 0, 1);
    const nextPrestige = driftPrestige(
      state.prestigeById || baselinePrestigeById(), state.year, powerById, state.teamId,
      clamp(0.55 * uWinPct + 0.45 * uRankQ, 0, 1)
    );
    const newYear = state.year + 1;
    const roster = buildInitialRoster(newTeam, newYear);
    coach.jobSecurity = 55; // new job, fresh honeymoon with the administration
    setState({
      ...state,
      teamId: newTeam.id,
      year: newYear,
      seasonSeed: (Math.random() * 0xffffffff) >>> 0,
      prestigeById: nextPrestige,
      roster,
      depthChart: defaultDepthChart(roster),
      schedule: genSchedule(newTeam, newYear),
      recruitingBoard: seedInterest(genRecruitPool(newYear + 1), newTeam),
      incomingCommits: [],
      recruitTargets: [],
      recruitingPoints: weeklyRecruitingBudget(newTeam),
      recruitingWeekIndex: 1,
      strengths: genSeasonStrengths(),
      postseason: null,
      offseason: null,
      coach,
      expectation: seasonExpectation(newTeam.prestige),
      rivalryLedger: {},
      awardsHistory: [
        ...(state.awardsHistory || []),
        ...(awards.userHonors.length ? [{ year: state.year, teamName: team.name, honors: awards.userHonors }] : []),
      ],
      history: [...state.history, { year: state.year, wins: record.w, losses: record.l, teamId: state.teamId, postseason: postseasonSummary(state.postseason, state.teamId), awards }],
    });
    setJobPickerOpen(false);
    setTab("dashboard");
    flash(`New job accepted — you're now the head coach at ${newTeam.name}.`);
  }

  // Coach edits a non-conference matchup (opponent or home/away). Conference
  // and already-played games are guarded in the UI, and defensively here.
  function editGame(gameId, changes) {
    setState((s) => {
      let c = changes;
      if ("oppId" in changes && !nonConfOppAllowed(s.schedule, gameId, changes.oppId, team.conf)) {
        c = { ...changes };
        delete c.oppId;
      }
      if (Object.keys(c).length === 0) return s;
      return {
        ...s,
        schedule: s.schedule.map((g) =>
          g.id === gameId && !g.conf && !g.played ? { ...g, ...c } : g
        ),
      };
    });
  }

  const seasonOver = state.schedule.every((g) => g.played);
  const psDone = !!(state.postseason && state.postseason.phase === "done");
  // The single source of truth for where in the annual cycle the coach is.
  const stage = !seasonOver
    ? "regular"
    : !state.postseason
      ? "prePostseason"
      : !psDone
        ? "postseason"
        : !state.offseason
          ? "preOffseason"
          : state.offseason.done
            ? "offseasonDone"
            : "offseason";

  return (
    <div className="cbb-root" style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.cream }}>
      <GlobalStyle />
      {/* LEFT RAIL */}
      <div style={{ width: 210, background: C.bgRail, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ width: 10, height: 10, background: team.primary, display: "inline-block", marginRight: 8 }} />
          <span className="cbb-num" style={{ fontWeight: 600, fontSize: 15 }}>{team.name}</span>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{team.conf}</div>
        </div>
        <div style={{ flex: 1, padding: "10px 0" }}>
          {navTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="cbb-btn"
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 18px", background: active ? C.panelAlt : "transparent",
                  borderLeft: active ? `3px solid ${C.wood}` : "3px solid transparent",
                  color: active ? C.cream : C.dim, cursor: "pointer", fontSize: 13.5, textAlign: "left",
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: 14, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => { saveDynasty(state); flash("Saved."); }} className="cbb-btn"
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "8px 10px", cursor: "pointer", fontSize: 12.5 }}>
            <Save size={13} /> Save Dynasty
          </button>
          <button onClick={onExit} className="cbb-btn"
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "8px 10px", cursor: "pointer", fontSize: 12.5 }}>
            <RotateCcw size={13} /> New Dynasty
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* SCOREBOARD HEADER */}
        <div style={{ background: C.bgRail, borderBottom: `2px solid ${C.wood}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em" }}>SEASON</div>
              <div className="cbb-num" style={{ fontSize: 22, fontWeight: 700 }}>{seasonLabel(state.year)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em" }}>RECORD</div>
              <div className="cbb-num" style={{ fontSize: 22, fontWeight: 700 }}>{record.w}-{record.l}</div>
            </div>
          </div>
          {toast && (
            <div style={{ fontSize: 13, background: C.panelAlt, border: `1px solid ${C.line}`, padding: "7px 14px", color: C.cream }}>{toast}</div>
          )}
        </div>

        <div className="cbb-scroll" style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          {tab === "dashboard" && (
            <DashboardTab state={state} team={team} record={record} nextGame={nextGame}
              stage={stage}
              onSim={simOneGame} onPlay={playOneGame} onSimToConf={simToConferencePlay} onSimSeason={simToEndOfSeason}
              onEnterPostseason={startPostseason} onEnterOffseason={enterOffseason}
              onGoTab={setTab} onAdvanceYear={advanceYear}
              reputation={reputation} bracketology={bracketology}
              expectation={state.expectation || seasonExpectation(team.prestige)}
              jobSecurity={state.coach?.jobSecurity ?? 60}
              onViewPlayer={setPlayerViewId} />
          )}
          {tab === "roster" && <RosterTab roster={state.roster} onViewPlayer={setPlayerViewId} />}
          {tab === "depth" && <DepthChartTab roster={state.roster} depthChart={state.depthChart} onMove={moveInDepthChart} onAssign={assignPosition} onRemove={removeFromDepth} />}
          {tab === "recruiting" && (
            <RecruitingTab
              board={state.recruitingBoard}
              committedIds={state.incomingCommits}
              targets={state.recruitTargets || []}
              onToggleTarget={toggleTarget}
              points={state.recruitingPoints}
              budget={weeklyRecruitingBudget(team)}
              weekIndex={state.recruitingWeekIndex}
              totalWeeks={TOTAL_SEASON_WEEKS}
              onAction={doRecruitAction}
              onSign={attemptSign}
              team={team}
              needs={needs}
              scholarshipInfo={scholarshipInfo}
            />
          )}
          {tab === "transfer-portal" && state.offseason && (
            <TransferPortalTab
              offseason={state.offseason}
              team={team}
              scholarshipInfo={scholarshipInfo}
              committedFreshmen={state.incomingCommits.length}
              onAction={doTransferAction}
              onSign={attemptSignTransfer}
              onAdvanceWeek={advanceOffseasonWeek}
            />
          )}
          {tab === "offseason" && (
            <OffseasonTab
              stage={stage}
              offseason={state.offseason}
              team={team}
              roster={state.roster}
              nextYear={state.year + 1}
              committedFreshmen={state.incomingCommits.length}
              scholarshipInfo={scholarshipInfo}
              rankById={rankById}
              onAction={doTransferAction}
              onSign={attemptSignTransfer}
              onPersuade={persuadePlayer}
              onAdvanceWeek={advanceOffseasonWeek}
              onEditGame={editDraftGame}
              onChangeJob={() => setJobPickerOpen(true)}
              onAdvanceYear={advanceYear}
              onViewTeam={setViewTeamId}
              onViewPlayer={setPlayerViewId}
              onCut={cutPlayer}
              onDev={adjustPlayerAttr}
            />
          )}
          {tab === "schedule" && <ScheduleTab schedule={state.schedule} teamConf={team.conf} rankById={rankById} rivalIds={rivalIds} onViewTeam={setViewTeamId} onEditGame={editGame} onViewBox={setBoxViewId} />}
          {tab === "standings" && <StandingsTab team={team} ranked={ranked} rankById={rankById} userRecord={record} onViewTeam={setViewTeamId} />}
          {tab === "rankings" && <RankingsTab ranked={ranked} userTeamId={state.teamId} onViewTeam={setViewTeamId} />}
          {tab === "leaderboard" && <LeaderboardTab leaders={leaders} userTeamId={state.teamId} year={state.year} onViewTeam={setViewTeamId} />}
          {tab === "program" && <ProgramTab state={state} team={team} record={record} reputation={reputation} rivalIds={rivalIds} rankById={rankById} />}
          {tab === "postseason" && (
            <PostseasonTab
              postseason={state.postseason}
              userTeamId={state.teamId}
              seasonOver={seasonOver}
              rankById={rankById}
              onStart={startPostseason}
              onSimRound={simPostseasonRound}
              onPlayGame={playUserPostseasonGame}
              userPending={!!findUserPendingMatchup(state.postseason, state.teamId)}
              onViewTeam={setViewTeamId}
            />
          )}
        </div>
      </div>

      {viewTeamId && (
        <TeamRosterModal teamId={viewTeamId} year={state.year} strengths={state.strengths} rank={rankById[viewTeamId]} poached={state.poachedPlayers || []} onClose={() => setViewTeamId(null)} />
      )}
      {jobPickerOpen && (
        <JobChangeModal
          currentTeamId={state.teamId}
          nextYear={state.year + 1}
          reputation={reputation}
          onPick={changeJob}
          onClose={() => setJobPickerOpen(false)}
        />
      )}
      {playerViewId && (
        <PlayerModal
          player={state.roster.find((p) => p.id === playerViewId)}
          onClose={() => setPlayerViewId(null)}
        />
      )}
      {boxViewId && (
        <BoxScoreModal
          game={state.schedule.find((g) => g.id === boxViewId)}
          teamName={team.name}
          onClose={() => setBoxViewId(null)}
        />
      )}
      {recap && (
        <SeasonRecapModal recap={recap} onClose={() => setRecap(null)} />
      )}
      {livePlay && (
        <LiveGame
          ctxInit={livePlay}
          onClose={() => setLivePlay(null)}
          onFinish={(result) => {
            const lp = livePlay;
            setLivePlay(null);
            if (lp.isPostseason) commitPostseasonUserGame(result, lp);
            else commitGameResult(result, lp.opp, lp.oppRank);
          }}
        />
      )}
      {visit && (
        <VisitExperience
          recruit={visit.recruit}
          actionKey={visit.actionKey}
          team={team}
          onClose={() => setVisit(null)}
          onFinish={finishVisit}
        />
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab({ state, team, record, nextGame, stage, onSim, onPlay, onSimToConf, onSimSeason, onEnterPostseason, onEnterOffseason, onGoTab, onAdvanceYear, reputation, bracketology, expectation, jobSecurity, onViewPlayer }) {
  const overall = Math.round(userTeamOverall(state.roster, state.depthChart));
  const topPlayer = [...state.roster].sort((a, b) => b.overall - a.overall)[0];
  const injured = state.roster.filter(isHurt);
  const streak = currentStreak(state.schedule);
  const hasUnplayedNonConf = state.schedule.some((g) => !g.conf && !g.played);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatBlock label="Team Overall" value={overall} />
        <StatBlock label="Record" value={`${record.w}-${record.l}`} />
        <StatBlock label="Roster Size" value={state.roster.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Panel style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em" }}>BRACKETOLOGY</div>
          <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: bracketology?.inField ? C.gold : C.cream }}>
            {bracketology ? (bracketology.inField ? `No. ${bracketology.seed} seed` : "Last Four Out") : "Not projected"}
          </div>
        </Panel>
        <Panel style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em" }}>REPUTATION</div>
          <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {reputation} <span style={{ fontSize: 12, color: C.wood }}>{reputationTier(reputation)}</span>
          </div>
        </Panel>
        <Panel style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em" }}>MOMENTUM</div>
          <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: streak > 0 ? C.green : streak < 0 ? C.red : C.cream }}>
            {streak === 0 ? "—" : `${Math.abs(streak)} ${streak > 0 ? "W" : "L"} streak`}
          </div>
        </Panel>
      </div>

      {expectation && (() => {
        const hs = hotSeatTier(jobSecurity);
        return (
          <Panel style={{ padding: "16px 20px", borderLeft: `3px solid ${hs.color}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 4 }}>{"ATHLETIC DIRECTOR'S EXPECTATION"}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.cream }}>{expectation.label}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{record.w}-{record.l} · target {expectation.winTarget} wins</div>
              </div>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                  <span>JOB SECURITY</span><span style={{ color: hs.color, fontWeight: 700 }}>{hs.label}</span>
                </div>
                <div style={{ height: 8, background: C.bg, border: `1px solid ${C.line}` }}>
                  <div style={{ height: "100%", width: `${jobSecurity}%`, background: hs.color }} />
                </div>
              </div>
            </div>
          </Panel>
        );
      })()}

      <Panel style={{ padding: 20 }}>
        {stage === "regular" && nextGame && (
          <>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>NEXT GAME</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div className="cbb-num" style={{ fontSize: 19, fontWeight: 600 }}>
                  {nextGame.home ? "vs" : "at"} {TEAM_MAP[nextGame.oppId].name}
                </div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
                  Week {nextGame.week} · {TEAM_MAP[nextGame.oppId].conf} · {nextGame.conf ? "Conference" : "Non-conference"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={onPlay} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><Gauge size={13} /> Play Game</button>
                <button onClick={onSim} className="cbb-btn" style={btnStyle(C.wood)}><Play size={13} /> Sim Game</button>
                {hasUnplayedNonConf && (
                  <button onClick={onSimToConf} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><FastForward size={13} /> Sim to Conference Play</button>
                )}
                <button onClick={onSimSeason} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><FastForward size={13} /> Sim Rest of Season</button>
              </div>
            </div>
          </>
        )}
        {stage === "prePostseason" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>Regular season complete — {record.w}-{record.l}. Time for the conference tournaments and March Madness.</div>
            <button onClick={onEnterPostseason} className="cbb-btn" style={btnStyle(C.wood)}><Crown size={13} /> Enter Postseason</button>
          </div>
        )}
        {stage === "postseason" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>The postseason is underway. Head to the Postseason tab to play out the brackets.</div>
            <button onClick={() => onGoTab("postseason")} className="cbb-btn" style={btnStyle(C.wood)}><Crown size={13} /> Go to Postseason</button>
          </div>
        )}
        {stage === "preOffseason" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>The national champion has been crowned. Enter the offseason to hit the transfer portal, set your schedule, and consider new jobs.</div>
            <button onClick={onEnterOffseason} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><GraduationCap size={13} /> Enter Offseason</button>
          </div>
        )}
        {stage === "offseason" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>Offseason week {state.offseason.week} of {OFFSEASON_WEEKS}. Manage transfers, your schedule, and coaching offers.</div>
            <button onClick={() => onGoTab("offseason")} className="cbb-btn" style={btnStyle(C.wood)}><GraduationCap size={13} /> Go to Offseason</button>
          </div>
        )}
        {stage === "offseasonDone" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>The offseason is complete. Begin the {seasonLabel(state.year + 1)} season.</div>
            <button onClick={onAdvanceYear} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><TrendingUp size={13} /> Begin {seasonLabel(state.year + 1)} Season</button>
          </div>
        )}
      </Panel>

      {injured.length > 0 && (
        <Panel style={{ padding: 20, borderLeft: `3px solid ${C.red}` }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <HeartPulse size={13} color={C.red} /> INJURY REPORT
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {injured.map((p) => (
              <div key={p.id} style={{ border: `1px solid ${C.line}`, padding: "6px 10px", fontSize: 12.5 }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: C.dim }}> · {p.pos} · out {p.injuredGames} game{p.injuredGames > 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {topPlayer && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>PROGRAM CORNERSTONE</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div onClick={() => onViewPlayer && onViewPlayer(topPlayer.id)} style={{ cursor: "pointer" }}>
              <div style={{ fontWeight: 600, fontSize: 16, borderBottom: `1px dotted ${C.dim}`, display: "inline-block" }}>{topPlayer.name}</div>
              <div style={{ fontSize: 12, color: C.dim }}>{topPlayer.pos} · {topPlayer.class} · OVR {topPlayer.overall}</div>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <MiniStat label="PPG" value={avg(topPlayer.season.pts, topPlayer.season.gp)} />
              <MiniStat label="RPG" value={avg(topPlayer.season.reb, topPlayer.season.gp)} />
              <MiniStat label="APG" value={avg(topPlayer.season.ast, topPlayer.season.gp)} />
            </div>
          </div>
        </Panel>
      )}

      {state.history.length > 0 && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12 }}>PROGRAM HISTORY</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {state.history.map((h) => {
              const title = h.postseason === "National Champions";
              return (
                <div key={h.year} style={{ border: `1px solid ${title ? C.gold : C.line}`, padding: "8px 12px", minWidth: 74 }}>
                  <div className="cbb-num" style={{ fontSize: 13, color: C.dim }}>{seasonLabel(h.year)}</div>
                  <div className="cbb-num" style={{ fontSize: 16, fontWeight: 600 }}>{h.wins}-{h.losses}</div>
                  {h.postseason && (
                    <div style={{ fontSize: 9.5, color: title ? C.gold : C.wood, marginTop: 3, letterSpacing: "0.03em" }}>{h.postseason}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function btnStyle(bg, color = "#fff") {
  return { display: "flex", alignItems: "center", gap: 6, background: bg, color, border: "none", padding: "9px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 };
}
function StatBlock({ label, value }) {
  return (
    <Panel style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
      <div className="cbb-num" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </Panel>
  );
}
function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="cbb-num" style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim }}>{label}</div>
    </div>
  );
}
function avg(total, gp) { return gp ? (total / gp).toFixed(1) : "0.0"; }

/* ---------- Roster ---------- */
function RosterTab({ roster, onViewPlayer }) {
  const sorted = [...roster].sort((a, b) => b.overall - a.overall);
  const realCount = roster.filter((p) => p.realName).length;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
        {realCount > 0 ? `${realCount} of ${roster.length} names came from real Torvik data (marked with •). ` : ""}
        Click any player for a full profile and game log.
      </div>
      <Panel style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
            <th style={th}>Player</th><th style={th}>Pos</th><th style={th}>Class</th><th style={th}>OVR</th>
            <th style={th}>PPG</th><th style={th}>RPG</th><th style={th}>APG</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
              onClick={() => onViewPlayer && onViewPlayer(p.id)}>
              <td style={td}>
                <div style={{ fontWeight: 600 }}>
                  {p.realName ? "• " : ""}{p.name}
                  {isHurt(p) && <span style={{ fontSize: 9.5, color: C.red, marginLeft: 6, letterSpacing: "0.06em", border: `1px solid ${C.red}`, padding: "1px 4px" }}>OUT {p.injuredGames}</span>}
                </div>
                {p.starsAtSigning != null && <StarRow stars={p.starsAtSigning} />}
              </td>
              <td style={td}>{p.pos}</td>
              <td style={td}>{p.class}</td>
              <td style={{ ...td, fontWeight: 700 }} className="cbb-num">{p.overall}</td>
              <td style={td}>{avg(p.season.pts, p.season.gp)}</td>
              <td style={td}>{avg(p.season.reb, p.season.gp)}</td>
              <td style={td}>{avg(p.season.ast, p.season.gp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </Panel>
    </div>
  );
}
const th = { padding: "10px 14px" };
const td = { padding: "10px 14px" };

/* ---------- Depth Chart ---------- */
function DepthChartTab({ roster, depthChart, onMove, onAssign, onRemove }) {
  const assignedIds = new Set(POSITIONS.flatMap((p) => depthChart[p]));
  const bench = roster.filter((p) => !assignedIds.has(p.id));
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 12, maxWidth: 720 }}>
        Slot any player at any position — a point guard can back up at the two, three, even the four or five. Playing someone out of position lowers their effective rating (shown in red), since their skills don&apos;t fit that role. Arrows set the rotation order (the top name plays the most minutes), the dropdown moves a player to another spot, and Bench pulls them out of the rotation.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {POSITIONS.map((pos) => (
          <Panel key={pos} style={{ padding: 14 }}>
            <div className="cbb-num" style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: C.wood }}>{pos}</div>
            {depthChart[pos].length === 0 && <div style={{ fontSize: 12, color: C.dimmer, paddingBottom: 6 }}>No one slotted here.</div>}
            {depthChart[pos].map((id, i) => {
              const p = roster.find((pl) => pl.id === id);
              if (!p) return null;
              const outOfPos = p.pos !== pos;
              const eff = computeOverall(pos, p.attrs);
              const last = i === depthChart[pos].length - 1;
              return (
                <div key={id} style={{ padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: isHurt(p) ? C.dimmer : C.cream }}>
                        {i === 0 ? "★ " : ""}{p.name}
                        {isHurt(p) && <span style={{ fontSize: 9, color: C.red, marginLeft: 5 }}>OUT</span>}
                      </div>
                      <div style={{ fontSize: 11, color: outOfPos ? C.red : C.dim }}>
                        {p.class} · OVR {eff}{outOfPos ? ` · natural ${p.pos} ${p.overall}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <button onClick={() => onMove(pos, i, -1)} disabled={i === 0} className="cbb-btn" style={{ background: "none", border: "none", color: i === 0 ? C.dimmer : C.dim, cursor: i === 0 ? "default" : "pointer" }}><ChevronUp size={14} /></button>
                      <button onClick={() => onMove(pos, i, 1)} disabled={last} className="cbb-btn" style={{ background: "none", border: "none", color: last ? C.dimmer : C.dim, cursor: last ? "default" : "pointer" }}><ChevronDown size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <select value={pos} onChange={(e) => onAssign(id, e.target.value)}
                      style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, fontSize: 11, padding: "2px 4px" }}>
                      {POSITIONS.map((pp) => <option key={pp} value={pp}>{pp === pos ? `At ${pp}` : `Move to ${pp}`}</option>)}
                    </select>
                    <button onClick={() => onRemove(id)} className="cbb-btn" style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Bench</button>
                  </div>
                </div>
              );
            })}
          </Panel>
        ))}
      </div>

      {bench.length > 0 && (
        <Panel style={{ padding: 14, marginTop: 14 }}>
          <div className="cbb-num" style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.dim }}>BENCH — NOT IN ROTATION</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {bench.map((p) => (
              <div key={p.id} style={{ border: `1px solid ${C.line}`, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isHurt(p) ? C.dimmer : C.cream }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: C.dim }}>{p.pos} · {p.class} · OVR {p.overall}</div>
                </div>
                <select value="" onChange={(e) => { if (e.target.value) onAssign(p.id, e.target.value); }}
                  style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, fontSize: 11, padding: "3px 4px" }}>
                  <option value="">Slot at…</option>
                  {POSITIONS.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------- Recruiting ---------- */
function InterestBar({ value, colorHigh }) {
  return (
    <div style={{ width: 64, height: 6, background: C.line, position: "relative" }}>
      <div style={{ width: `${clamp(value, 0, 100)}%`, height: "100%", background: colorHigh ? C.green : C.wood }} />
    </div>
  );
}

// Shared recruit-board list used by both in-season recruiting and the
// off-season transfer portal. `weekIndex`/`totalWeeks` drive per-week action
// limits (calls, home visits) and the signing-progress readout.
function RecruitBoard({ board, committedIds, targets, onToggleTarget, points, weekIndex, totalWeeks, onAction, onSign, needs, maxSign, emptyLabel, team }) {
  const [view, setView] = useState("all"); // all | targets | committed
  const [posFilter, setPosFilter] = useState("ALL");
  const [starFilter, setStarFilter] = useState(0);
  const [stateFilter, setStateFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("interest"); // interest | stars | rank
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const needSet = new Set(needs || []);
  const targetSet = new Set(targets || []);
  const q = query.trim().toLowerCase();

  // Distinct hometown states present on the board (INTL grouped last).
  const stateOptions = useMemo(() => {
    const set = new Set();
    board.forEach((r) => { if (r.state && r.state !== "\u2014") set.add(r.state); });
    const arr = [...set];
    const intl = arr.includes("INTL");
    const domestic = arr.filter((s) => s !== "INTL").sort();
    return intl ? [...domestic, "INTL"] : domestic;
  }, [board]);

  let list = board.filter((r) => {
    const mine = committedIds.includes(r.id);
    if (r.committedTo && !mine) return false; // signed elsewhere — off the board
    if (view === "targets" && !targetSet.has(r.id)) return false;
    if (view === "committed" && !mine) return false;
    if (posFilter !== "ALL" && r.pos !== posFilter) return false;
    if (starFilter && (r.stars || 0) < starFilter) return false;
    if (stateFilter !== "ALL" && r.state !== stateFilter) return false;
    if (q && !`${r.name} ${r.state} ${r.hometown || ""} ${r.pos}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sortFns = {
    interest: (a, b) => (b.interest - a.interest) || ((a.nationalRank || 999) - (b.nationalRank || 999)),
    stars: (a, b) => ((b.stars || 0) - (a.stars || 0)) || ((a.nationalRank || 999) - (b.nationalRank || 999)),
    rank: (a, b) => (a.nationalRank || 999) - (b.nationalRank || 999),
  };
  list = list.sort((a, b) =>
    (Number(committedIds.includes(b.id)) - Number(committedIds.includes(a.id))) ||
    (sortFns[sortBy] || sortFns.interest)(a, b)
  );
  const shown = list.slice(0, 80);
  const canTarget = typeof onToggleTarget === "function";

  const chip = (label, active, onClick) => (
    <button onClick={onClick} className="cbb-btn"
      style={{ fontSize: 12, padding: "6px 12px", border: `1px solid ${active ? C.wood : C.line}`, background: active ? C.panelAlt : "transparent", color: active ? C.cream : C.dim, cursor: "pointer" }}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {chip("All", view === "all", () => setView("all"))}
        {canTarget && chip(`Targets (${targetSet.size})`, view === "targets", () => setView("targets"))}
        {chip(`Committed (${committedIds.length})`, view === "committed", () => setView("committed"))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, state, position…"
          style={{ flex: 1, minWidth: 180, background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "7px 10px", fontSize: 13 }}
        />
        <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value="ALL">All positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={starFilter} onChange={(e) => setStarFilter(Number(e.target.value))}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value={0}>Any stars</option>
          {[5, 4, 3, 2].map((s) => <option key={s} value={s}>{s}★ and up</option>)}
        </select>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value="ALL">All states</option>
          {stateOptions.map((s) => <option key={s} value={s}>{s === "INTL" ? "International" : s}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value="interest">Sort: Interest</option>
          <option value="stars">Sort: Stars</option>
          <option value="rank">Sort: National rank</option>
        </select>
      </div>

      {needs && needs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", border: `1px solid ${C.wood}`, background: C.panel, fontSize: 12.5 }}>
          <span style={{ color: C.wood, letterSpacing: "0.06em", fontWeight: 600 }}>TEAM NEEDS</span>
          <span style={{ color: C.dim }}>Thin next season at</span>
          {needs.map((p) => (
            <span key={p} className="cbb-num" style={{ border: `1px solid ${C.wood}`, color: C.gold, padding: "1px 7px", fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.length === 0 && (
          <div style={{ color: C.dimmer, fontSize: 13, padding: "18px 4px" }}>{emptyLabel || "No prospects match those filters."}</div>
        )}
        {shown.map((r) => {
          const mine = committedIds.includes(r.id);
          const open = openId === r.id;
          const chance = signChance(r);
          const isTarget = targetSet.has(r.id);
          return (
            <Panel key={r.id} style={{ padding: 0 }}>
              <div className="cbb-row"
                onClick={() => setOpenId(open ? null : r.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: mine ? "default" : "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  {canTarget && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTarget(r.id); }}
                      className="cbb-btn"
                      title={isTarget ? "Remove target" : "Add target"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isTarget ? C.gold : C.dimmer, padding: 0 }}
                    >
                      <Star size={16} fill={isTarget ? C.gold : "none"} />
                    </button>
                  )}
                  <span className="cbb-num" style={{ width: 34, color: C.dimmer, fontSize: 11 }}>#{r.nationalRank ?? "—"}</span>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {r.name}
                      {needSet.has(r.pos) && (
                        <span style={{ fontSize: 9.5, color: C.gold, marginLeft: 6, letterSpacing: "0.06em", border: `1px solid ${C.wood}`, padding: "1px 4px", verticalAlign: "middle" }}>FILLS NEED</span>
                      )}
                      {r.isTransfer && (
                        <span style={{ fontSize: 9.5, color: C.wood, marginLeft: 6, letterSpacing: "0.06em", border: `1px solid ${C.line}`, padding: "1px 4px", verticalAlign: "middle" }}>{r.classYear} TRANSFER</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.dim }} title={r.international ? r.hometownPlace : undefined}>
                      {r.pos} · <span title={r.international ? r.hometownPlace : undefined}>{r.hometown || r.state}</span> · {r.hsStatline.ppg} ppg
                    </div>
                  </div>
                  <StarRow stars={r.stars} />
                  <span style={{ color: C.dimmer, fontSize: 11, width: 48 }}>{r.rating ? r.rating.toFixed(3) : "—"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: C.dim }}>Interest</span>
                    <InterestBar value={r.interest} colorHigh={r.interest >= r.rivalPressure} />
                  </div>
                </div>
                {mine ? (
                  <span style={{ color: C.green, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> Signed</span>
                ) : (
                  <span style={{ fontSize: 11, color: C.dimmer }}>{Math.round(chance * 100)}% to sign</span>
                )}
              </div>

              {open && !mine && (
                <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {Object.values(RECRUIT_ACTIONS).map((action) => {
                    const usable = canTakeAction(r, action.key, points, weekIndex, team);
                    const cost = actionCostFor(action.key, r, team);
                    let sub = "";
                    if (action.key === "CALL") sub = ` (${r.callsThisWeek || 0}/${action.perWeek} this wk)`;
                    else if (action.key === "HOME") sub = ` (${r.homeVisitsUsed || 0}/${action.maxSeason})`;
                    else if (action.key === "VISIT") sub = ` (${r.visitsUsed || 0}/${action.maxUses})`;
                    else if (action.key === "OFFER" && r.offerExtended) sub = " ✓";
                    const isVisit = action.key === "VISIT" || action.key === "HOME";
                    const miles = isVisit ? recruitDistanceMiles(r, team) : null;
                    const distTip = isVisit
                      ? (r.international ? "International — capped cost" : miles != null ? `${Math.round(miles)} mi from campus` : "Distance unknown — capped cost")
                      : undefined;
                    return (
                      <button key={action.key} disabled={!usable} onClick={() => onAction(r, action.key)} className="cbb-btn"
                        title={distTip}
                        style={{
                          fontSize: 12, padding: "7px 11px", border: `1px solid ${C.line}`,
                          background: action.key === "OFFER" && r.offerExtended ? C.panelAlt : "transparent",
                          color: usable ? C.cream : C.dimmer, cursor: usable ? "pointer" : "not-allowed",
                        }}>
                        {action.label} · {cost}pt{sub}
                      </button>
                    );
                  })}
                  {(() => {
                    const status = signAttemptStatus(r, weekIndex);
                    const left = MAX_SIGN_ATTEMPTS - (r.signAttempts || 0);
                    let label;
                    if (status.reason === "offer") label = "Offer required to sign";
                    else if (status.reason === "max") label = "No sign attempts left";
                    else if (status.reason === "week") label = `Already tried this week (${left} left)`;
                    else if (status.reason === "odds") label = `Need >50% to sign (${Math.round(chance * 100)}%)`;
                    else label = `Attempt to Sign (${Math.round(chance * 100)}%) · ${left} left`;
                    return (
                      <button onClick={() => onSign(r)} disabled={!status.ok} className="cbb-btn"
                        title={status.ok ? undefined : "You can attempt to sign once a recruit is above 50%, once per week, up to twice overall."}
                        style={{ ...btnStyle(status.ok ? C.wood : C.line), fontSize: 12, padding: "7px 12px", cursor: status.ok ? "pointer" : "not-allowed" }}>
                        {label}
                      </button>
                    );
                  })()}
                </div>
              )}
            </Panel>
          );
        })}
        {list.length > shown.length && (
          <div style={{ color: C.dimmer, fontSize: 11.5, padding: "6px 4px" }}>Showing top {shown.length} of {list.length} — refine with search or filters to see more.</div>
        )}
      </div>
    </div>
  );
}

function RecruitingTab({ board, committedIds, targets, onToggleTarget, points, budget, weekIndex, totalWeeks, onAction, onSign, team, needs = [], scholarshipInfo }) {
  const pct = Math.round(clamp((weekIndex - 1) / totalWeeks, 0, 1) * 100);
  const open = scholarshipInfo?.open ?? 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: C.dim }}>Open scholarships: <strong style={{ color: open > 0 ? C.gold : C.red }}>{open}</strong> / {SCHOLARSHIP_LIMIT}</div>
          <div style={{ fontSize: 13, color: C.dim }}>Committed: <strong style={{ color: C.cream }}>{committedIds.length}</strong></div>
          <div style={{ fontSize: 13, color: C.dim }}>Points this week: <strong style={{ color: C.gold }}>{points}</strong> / {budget}</div>
          <div style={{ fontSize: 13, color: C.dim }}>Signing period: <strong style={{ color: C.cream }}>{pct}%</strong> elapsed</div>
        </div>
      </div>
      {open <= 0 && (
        <div style={{ fontSize: 12, color: C.red, border: `1px solid ${C.red}`, padding: "8px 12px", marginBottom: 12 }}>
          All 13 scholarships are committed. Cut a player in the offseason to open a spot before signing anyone new.
        </div>
      )}
      <RecruitBoard
        board={board} committedIds={committedIds} targets={targets} onToggleTarget={onToggleTarget}
        points={points} weekIndex={weekIndex} totalWeeks={totalWeeks}
        onAction={onAction} onSign={onSign} needs={needs} maxSign={5} team={team}
        emptyLabel="No high-school prospects match those filters."
      />
      <div style={{ fontSize: 11.5, color: C.dimmer, marginTop: 14, maxWidth: 700 }}>
        Every prospect carries a 1-5 star rating from their production, adjusted for level of competition. Star a recruit to add them to your Targets list. Extend an <strong>offer</strong> (5 pts) to make a recruit sign-eligible; work them with <strong>phone calls</strong> (5 pts, twice a week), an <strong>official visit</strong> (25 pts, once), and <strong>home visits</strong> (20 pts, twice a season).         Recruits commit throughout the season, and by signing day everyone still uncommitted lands somewhere. Transfers only open up in the off-season portal.
      </div>
    </div>
  );
}

/* ---------- Offseason: player development ---------- */
function DevStepper({ label, value, spent, canAdd, canSub, onAdd, onSub }) {
  const step = { width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <div style={{ width: 96, fontSize: 11.5, color: C.dim }}>{label}</div>
      <div style={{ flex: 1, height: 7, background: C.line, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, width: `${clamp(value, 0, 99)}%`, background: value >= 80 ? C.gold : value >= 65 ? C.wood : C.dim }} />
      </div>
      <div className="cbb-num" style={{ width: 24, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>{value}</div>
      {spent > 0 && <span className="cbb-num" style={{ fontSize: 10, color: C.green, width: 22 }}>+{spent}</span>}
      {spent === 0 && <span style={{ width: 22 }} />}
      <button className="cbb-btn" onClick={onSub} disabled={!canSub} style={{ ...step, color: canSub ? C.cream : C.dimmer, cursor: canSub ? "pointer" : "not-allowed" }}>−</button>
      <button className="cbb-btn" onClick={onAdd} disabled={!canAdd} style={{ ...step, color: canAdd ? C.cream : C.dimmer, cursor: canAdd ? "pointer" : "not-allowed" }}>+</button>
    </div>
  );
}

function ProgressionPanel({ roster, devPoints, devSpent, onDev, onViewPlayer }) {
  const [openId, setOpenId] = useState(null);
  const sorted = [...roster].sort((a, b) => b.overall - a.overall);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: C.dim }}>Development points left: <strong style={{ color: devPoints > 0 ? C.gold : C.dimmer }}>{devPoints}</strong></span>
        <span style={{ fontSize: 11.5, color: C.dimmer }}>Spend up to {DEV_MAX_PER_ATTR} on any single attribute per player.</span>
      </div>
      <Panel style={{ padding: 0 }}>
        {sorted.map((p, idx) => {
          const open = openId === p.id;
          const pSpent = (devSpent && devSpent[p.id]) || {};
          const totalSpent = Object.values(pSpent).reduce((a, b) => a + b, 0);
          return (
            <div key={p.id} style={{ borderBottom: idx === sorted.length - 1 ? "none" : `1px solid ${C.line}` }}>
              <div className="cbb-row" onClick={() => setOpenId(open ? null : p.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span className="cbb-num" style={{ width: 30, fontWeight: 700, fontSize: 14, color: C.wood }}>{p.pos}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.realName ? "• " : ""}{p.name}{!p.scholarship && <span style={{ fontSize: 9, color: C.dimmer, marginLeft: 6, border: `1px solid ${C.line}`, padding: "1px 4px" }}>WALK-ON</span>}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{p.class} · OVR {p.overall}{totalSpent > 0 ? ` · +${totalSpent} spent` : ""}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: C.dim }}>{open ? "Hide" : "Develop"}</span>
              </div>
              {open && (
                <div style={{ padding: "4px 14px 14px" }}>
                  {ATTR_KEYS.map((k) => {
                    const spent = pSpent[k] || 0;
                    const val = p.attrs[k] ?? 40;
                    return (
                      <DevStepper key={k} label={ATTR_LABELS[k]} value={val} spent={spent}
                        canAdd={devPoints > 0 && spent < DEV_MAX_PER_ATTR && val < 99}
                        canSub={spent > 0}
                        onAdd={() => onDev(p.id, k, 1)} onSub={() => onDev(p.id, k, -1)} />
                    );
                  })}
                  {onViewPlayer && (
                    <button className="cbb-btn" onClick={() => onViewPlayer(p.id)}
                      style={{ marginTop: 6, fontSize: 11.5, background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "4px 10px", cursor: "pointer" }}>
                      View full profile
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

function CutsPanel({ roster, scholarshipInfo, onCut, onViewPlayer }) {
  const sorted = [...roster].sort((a, b) => b.overall - a.overall);
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10, maxWidth: 720 }}>
        You can carry 16 players but only {SCHOLARSHIP_LIMIT} scholarships. Cutting a scholarship player frees a spot to sign a recruit or transfer. Walk-ons don&apos;t use a scholarship.
      </div>
      <Panel style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
              <th style={th}>Player</th><th style={th}>Pos</th><th style={th}>Class</th><th style={th}>OVR</th><th style={th}>Status</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ ...td, cursor: onViewPlayer ? "pointer" : "default", fontWeight: 600 }} onClick={() => onViewPlayer && onViewPlayer(p.id)}>{p.realName ? "• " : ""}{p.name}</td>
                <td style={td}>{p.pos}</td>
                <td style={td}>{p.class}</td>
                <td style={{ ...td, fontWeight: 700 }} className="cbb-num">{p.overall}</td>
                <td style={td}>
                  {p.scholarship
                    ? <span style={{ fontSize: 10.5, color: C.gold, border: `1px solid ${C.wood}`, padding: "1px 6px" }}>SCHOLARSHIP</span>
                    : <span style={{ fontSize: 10.5, color: C.dimmer, border: `1px solid ${C.line}`, padding: "1px 6px" }}>WALK-ON</span>}
                </td>
                <td style={td}>
                  <button className="cbb-btn" onClick={() => onCut(p.id)}
                    style={{ fontSize: 11.5, background: "transparent", border: `1px solid ${C.red}`, color: C.red, padding: "3px 12px", cursor: "pointer" }}>
                    Cut
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------- Offseason ---------- */
// Dedicated Transfer Portal tab — only mounted during the offseason. Works the
// same portal board as the Offseason tab so either entry point stays in sync.
function TransferPortalTab({ offseason, team, scholarshipInfo, committedFreshmen, onAction, onSign, onAdvanceWeek }) {
  const committed = offseason.committedTransfers || [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.wood, letterSpacing: "0.08em", fontWeight: 600 }}>TRANSFER PORTAL</div>
          <h2 className="cbb-num" style={{ fontSize: 24, fontWeight: 700, margin: "2px 0" }}>
            {offseason.done ? "Portal closed" : `Week ${offseason.week} of ${OFFSEASON_WEEKS}`}
          </h2>
        </div>
        {!offseason.done && (
          <button onClick={onAdvanceWeek} className="cbb-btn" style={btnStyle(C.wood)}><FastForward size={13} /> Advance Week</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14, fontSize: 13, color: C.dim }}>
        <div>Open scholarships: <strong style={{ color: (scholarshipInfo?.open ?? 0) > 0 ? C.gold : C.red }}>{scholarshipInfo?.open ?? 0}</strong> / {SCHOLARSHIP_LIMIT}</div>
        <div>Portal points this week: <strong style={{ color: C.gold }}>{offseason.points}</strong></div>
        <div>Transfers committed: <strong style={{ color: C.cream }}>{committed.length}</strong></div>
        <div>HS signees this cycle: <strong style={{ color: C.cream }}>{committedFreshmen}</strong></div>
      </div>

      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 12, maxWidth: 720 }}>
        Incoming transfers are available only during the offseason. Work them exactly like high-school prospects — visit costs scale with how far their hometown is from your campus. All transfers commit somewhere by the end of the {OFFSEASON_WEEKS} weeks.
      </div>

      <RecruitBoard
        board={offseason.transferBoard}
        committedIds={committed}
        points={offseason.points}
        weekIndex={offseason.week}
        totalWeeks={OFFSEASON_WEEKS}
        onAction={onAction}
        onSign={onSign}
        team={team}
        emptyLabel="No transfers match those filters."
      />
    </div>
  );
}

// Off-season draft decisions: each declared underclassman gets one persuasion
// attempt. Pick the pitch that lands and they withdraw and return next season.
function DraftDecisionsPanel({ declarations, onPersuade }) {
  const [pitchChoice, setPitchChoice] = useState({});
  if (!declarations || declarations.length === 0) {
    return (
      <Panel style={{ padding: "14px 16px" }}>
        <div style={{ color: C.dim, fontSize: 12.5 }}>No underclassmen declared early for the NBA Draft this offseason.</div>
      </Panel>
    );
  }
  const pending = declarations.filter((d) => !d.attempted).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 2, maxWidth: 720 }}>
        {pending > 0
          ? "Each player will hear you out once. Choose the pitch you think will resonate — only one works, and you get a single attempt per player."
          : "Every declared player has heard your pitch."}
      </div>
      {declarations.map((d) => {
        const decided = d.attempted;
        const sel = pitchChoice[d.id];
        return (
          <Panel key={d.id} style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{d.name}</span>
                <span className="cbb-num" style={{ fontSize: 11, color: C.dim, marginLeft: 8 }}>{d.pos} · {d.class} · {d.overall} OVR</span>
              </div>
              {decided ? (
                <span style={{ fontSize: 12, color: d.kept ? C.green : C.red, display: "flex", alignItems: "center", gap: 4 }}>
                  {d.kept ? <><Check size={13} /> Returning</> : "Staying in draft"}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: C.gold, letterSpacing: "0.05em" }}>DECLARED</span>
              )}
            </div>
            {!decided && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {PERSUADE_PITCHES.map((pitch, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.cream, cursor: "pointer" }}>
                    <input type="radio" name={`pitch-${d.id}`} checked={sel === i}
                      onChange={() => setPitchChoice((p) => ({ ...p, [d.id]: i }))} />
                    <span>&ldquo;{pitch}&rdquo;</span>
                  </label>
                ))}
                <div>
                  <button className="cbb-btn" disabled={sel == null} onClick={() => onPersuade(d.id, sel)}
                    style={{ ...btnStyle(sel == null ? C.line : C.wood), fontSize: 12, padding: "6px 12px", marginTop: 4, cursor: sel == null ? "not-allowed" : "pointer" }}>
                    Make Pitch
                  </button>
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function OffseasonTab({ stage, offseason, team, roster, nextYear, committedFreshmen, scholarshipInfo, rankById, onAction, onSign, onPersuade, onAdvanceWeek, onEditGame, onChangeJob, onAdvanceYear, onViewTeam, onViewPlayer, onCut, onDev }) {
  if (!offseason) {
    return (
      <div>
        <SectionIntro>The offseason opens once a national champion is crowned. It runs {OFFSEASON_WEEKS} weeks: work the transfer portal, set next season&apos;s non-conference schedule, and weigh coaching offers. All transfers commit by the end of the four weeks.</SectionIntro>
        <Panel style={{ padding: 28, textAlign: "center", maxWidth: 460 }}>
          <GraduationCap size={26} color={C.wood} />
          <div style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>Finish the postseason, then enter the offseason from the Dashboard.</div>
        </Panel>
      </div>
    );
  }

  const draftNonConf = (offseason.scheduleDraft || []).filter((g) => !g.conf);
  const committed = offseason.committedTransfers || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.wood, letterSpacing: "0.08em", fontWeight: 600 }}>OFFSEASON</div>
          <h2 className="cbb-num" style={{ fontSize: 24, fontWeight: 700, margin: "2px 0" }}>
            {offseason.done ? "Portal closed" : `Week ${offseason.week} of ${OFFSEASON_WEEKS}`}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onChangeJob} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><Users size={13} /> Coaching Offers</button>
          {!offseason.done && (
            <button onClick={onAdvanceWeek} className="cbb-btn" style={btnStyle(C.wood)}><FastForward size={13} /> Advance Week</button>
          )}
          <button onClick={onAdvanceYear} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><TrendingUp size={13} /> Begin {seasonLabel(nextYear)} Season</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14, fontSize: 13, color: C.dim }}>
        <div>Open scholarships: <strong style={{ color: (scholarshipInfo?.open ?? 0) > 0 ? C.gold : C.red }}>{scholarshipInfo?.open ?? 0}</strong> / {SCHOLARSHIP_LIMIT}</div>
        <div>Portal points this week: <strong style={{ color: C.gold }}>{offseason.points}</strong></div>
        <div>Transfers committed: <strong style={{ color: C.cream }}>{committed.length}</strong></div>
        <div>HS signees this cycle: <strong style={{ color: C.cream }}>{committedFreshmen}</strong></div>
      </div>

      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>PLAYER DEVELOPMENT</div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10, maxWidth: 720 }}>Spend {DEV_POINTS_PER_OFFSEASON} development points improving your roster&apos;s attributes for next season. Real players keep these gains permanently on top of their production.</div>
      <ProgressionPanel roster={roster} devPoints={offseason.devPoints ?? 0} devSpent={offseason.devSpent} onDev={onDev} onViewPlayer={onViewPlayer} />

      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", margin: "22px 0 8px" }}>ROSTER &amp; CUTS</div>
      <CutsPanel roster={roster} scholarshipInfo={scholarshipInfo} onCut={onCut} onViewPlayer={onViewPlayer} />

      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", margin: "22px 0 8px" }}>NBA DRAFT DECISIONS</div>
      <DraftDecisionsPanel declarations={offseason.draftDeclarations} onPersuade={onPersuade} />

      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", margin: "22px 0 8px" }}>TRANSFER PORTAL</div>
      <RecruitBoard
        board={offseason.transferBoard}
        committedIds={committed}
        points={offseason.points}
        weekIndex={offseason.week}
        totalWeeks={OFFSEASON_WEEKS}
        onAction={onAction}
        onSign={onSign}
        team={team}
        emptyLabel="No transfers match those filters."
      />

      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", margin: "22px 0 8px" }}>SCHEDULE SETUP — {seasonLabel(nextYear)} NON-CONFERENCE</div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>Set next season&apos;s non-conference slate now. Use Change to pick an opponent or flip home/away; your conference games are assigned automatically.</div>
      <Panel style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Wk</th><th style={{ padding: "10px 14px" }}>Opponent</th><th style={{ padding: "10px 14px" }}>Site</th><th style={{ padding: "10px 14px" }}>Result</th><th style={{ padding: "10px 14px" }}></th>
            </tr>
          </thead>
          <tbody>
            {draftNonConf.map((g) => (
              <ScheduleRow key={g.id} g={g} teamConf={team.conf} rankById={rankById} isRival={false}
                takenOppIds={new Set(draftNonConf.map((d) => d.oppId))}
                onViewTeam={onViewTeam} onEditGame={onEditGame} onViewBox={null} />
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------- Schedule ---------- */
/* ---------- Shared Modal ---------- */
function Modal({ title, subtitle, onClose, children, maxWidth = 760 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="cbb-scroll"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", zIndex: 50, overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth, background: C.panel, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.wood}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.panel }}>
          <div>
            <div className="cbb-num" style={{ fontSize: 19, fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="cbb-btn" style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 2 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

/* =========================================================================
   COACH MODE — interactive, playable game
   The user tips off a game, sets a game plan, calls timeouts, and plays it out
   possession by possession. Coaching choices apply a small, bounded edge on top
   of the same talent-driven model the auto-sim uses, so decisions matter but the
   better team still wins most nights. The final result is emitted in the exact
   { win, myScore, oppScore, boxByPlayer } shape simulateGame returns, so every
   downstream system (stats, streaks, recruiting cadence) behaves identically.
   ========================================================================= */
const TEMPO_POSS = { slow: 58, balanced: 65, fast: 73 };

// Minute-weighted lean toward interior vs perimeter play, used to reward a game
// plan that fits the roster you actually field.
function liveTendencies(roster, depthChart) {
  let inside = 0, perim = 0, mins = 0;
  POSITIONS.forEach((pos) => {
    const order = (depthChart[pos] || []).filter((id) => roster.find((p) => p.id === id));
    const m = depthChartMinutes(order);
    order.forEach((id, i) => {
      const p = roster.find((x) => x.id === id);
      if (!p || !m[i]) return;
      const a = p.attrs;
      inside += ((a.rebounding + a.postDefense + a.blocks) / 3) * m[i];
      perim += ((a.threePoint + a.ballHandling + a.scoring) / 3) * m[i];
      mins += m[i];
    });
  });
  if (!mins) return { inside: 50, perimeter: 50 };
  return { inside: inside / mins, perimeter: perim / mins };
}

// Pick the scorer on a made bucket, weighted by minutes and scoring rating so
// the box score reads like the rotation you're actually running.
function pickScorer(roster, depthChart) {
  const weighted = [];
  POSITIONS.forEach((pos) => {
    const order = (depthChart[pos] || []).filter((id) => roster.find((p) => p.id === id));
    const mins = depthChartMinutes(order);
    order.forEach((id, i) => {
      const p = roster.find((x) => x.id === id);
      if (!p || !mins[i]) return;
      weighted.push({ name: p.name, w: mins[i] * (0.4 + p.attrs.scoring / 99) });
    });
  });
  if (!weighted.length) return "The offense";
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) { r -= x.w; if (r <= 0) return x.name; }
  return weighted[0].name;
}

// One possession. Returns { pts, three, made }.
function livePossession({ offMe, myPower, oppPower, gp, tend, boost, fatigue }) {
  let net, threeBias;
  if (offMe) {
    net = myPower - oppPower + boost;
    if (gp.offFocus === "inside") net += tend.inside > tend.perimeter ? 2 : -1.5;
    if (gp.offFocus === "perimeter") net += tend.perimeter > tend.inside ? 2 : -1.5;
    threeBias = gp.offFocus === "perimeter" ? 0.42 : gp.offFocus === "inside" ? 0.18 : 0.33;
  } else {
    net = oppPower - myPower + fatigue;
    if (gp.defScheme === "press") net -= 2.4;
    if (gp.defScheme === "pack") net -= 1.0;
    threeBias = gp.defScheme === "pack" ? 0.22 : 0.33;
  }
  const scoreProb = clamp(0.47 + net * 0.0028, 0.28, 0.7);
  if (Math.random() < scoreProb) {
    const three = Math.random() < threeBias;
    return { pts: three ? 3 : 2, three, made: true };
  }
  return { pts: 0, three: false, made: false };
}

// Advance the game one possession, returning the next immutable game state.
function stepLive(g, ctx) {
  if (g.finished) return g;
  const e = g.event;
  const offMe = e % 2 === 0;
  const boost = offMe && g.boostPoss > 0 ? 3 : 0;
  const res = livePossession({ offMe, myPower: ctx.myPower, oppPower: ctx.oppPower, gp: g.gp, tend: ctx.tend, boost, fatigue: g.fatigue });
  let { my, opp } = g;
  let text;
  if (offMe) {
    if (res.made) { my += res.pts; const who = pickScorer(ctx.roster, ctx.dc); text = res.three ? `${who} drains a three` : `${who} scores${res.pts === 2 ? "" : ""} inside`; }
    else text = pick(["Shot rims out", "Turnover", "Contested miss", "Shot clock violation"]);
  } else {
    if (res.made) { opp += res.pts; text = `${ctx.oppName} ${res.three ? "hits from deep" : "answers with a bucket"}`; }
    else text = pick([`${ctx.oppName} misses`, `Stop! ${ctx.oppName} turns it over`, `${ctx.oppName} bricks it`]);
  }
  const event = e + 1;
  const inOT = event > 2 * ctx.T;
  const fatigue = clamp(g.fatigue + 0.02 + (g.gp.defScheme === "press" ? 0.05 : 0) + (g.gp.tempo === "fast" ? 0.03 : 0), 0, 4);
  const boostPoss = offMe && g.boostPoss > 0 ? g.boostPoss - 1 : g.boostPoss;
  const oppRun = offMe ? (res.made ? 0 : g.oppRun) : (res.made ? g.oppRun + res.pts : g.oppRun);
  const half = event > ctx.T ? 2 : 1;
  const log = [{ id: event, my, opp, offMe, text, half, ot: inOT }, ...g.log].slice(0, 80);
  // Regulation ends after 2*T possessions; a tie forces sudden extra possessions.
  const reachedEnd = event >= 2 * ctx.T;
  const finished = reachedEnd && my !== opp;
  return { ...g, my, opp, event, fatigue, boostPoss, oppRun, log, finished, inOT: reachedEnd };
}

// Box score for a completed played game, normalized so points sum to the score
// the user actually watched pile up.
function genLiveBox(roster, depthChart, teamPts) {
  const box = {};
  POSITIONS.forEach((pos) => {
    const order = (depthChart[pos] || []).filter((id) => roster.find((p) => p.id === id));
    const mins = depthChartMinutes(order);
    order.forEach((id, i) => {
      const m = mins[i];
      if (!m) return;
      const p = roster.find((x) => x.id === id);
      box[id] = {
        pts: Math.max(0, Math.round((m / 30) * (p.attrs.scoring / 99) * 24 * rand(0.7, 1.3))),
        reb: Math.max(0, Math.round((m / 30) * (p.attrs.rebounding / 99) * 11 * rand(0.6, 1.4))),
        ast: Math.max(0, Math.round((m / 30) * (p.attrs.passing / 99) * 7 * rand(0.5, 1.5))),
        min: m,
      };
    });
  });
  const ids = Object.keys(box);
  const sum = ids.reduce((s, id) => s + box[id].pts, 0) || 1;
  const scale = teamPts / sum;
  ids.forEach((id) => { box[id].pts = Math.max(0, Math.round(box[id].pts * scale)); });
  let drift = teamPts - ids.reduce((s, id) => s + box[id].pts, 0);
  if (drift !== 0 && ids.length) {
    const top = [...ids].sort((a, b) => box[b].pts - box[a].pts)[0];
    box[top].pts = Math.max(0, box[top].pts + drift);
  }
  return box;
}

function fmtClock(g, T) {
  const half = g.event > T ? 2 : 1;
  const eventsThisHalf = half === 1 ? g.event : g.event - T;
  const perEvent = 1200 / T;
  const remain = Math.max(0, Math.round(1200 - eventsThisHalf * perEvent));
  const mm = Math.floor(remain / 60), ss = remain % 60;
  return { half, label: `${mm}:${ss.toString().padStart(2, "0")}` };
}

function PlanButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="cbb-btn" style={{
      flex: 1, padding: "7px 6px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
      background: active ? C.wood : C.panelAlt, color: active ? "#fff" : C.dim,
      border: `1px solid ${active ? C.wood : C.line}`,
    }}>{children}</button>
  );
}

// Content for the interactive recruiting trip. Each moment offers three pitch
// approaches keyed by tone: "bold" swings for the fences (high variance),
// "balanced" is a dependable middle, "safe" is steady but modest. The best
// choice isn't fixed — a bold pitch can land huge or fall flat — so visits
// reward reading the room rather than mashing one button.
const VISIT_SCRIPTS = {
  VISIT: {
    label: "Official Visit",
    Icon: Users,
    intro: "You've got them on campus for the weekend. Every stop is a chance to sell the program.",
    perMoment: [5, 9],
    moments: [
      { prompt: "First impression — how do you show off the program?", options: [
        { label: "Walk him out to a packed practice-night arena", tone: "bold" },
        { label: "Break down film of exactly how he'd fit", tone: "balanced" },
        { label: "Quiet tour of the facilities and locker room", tone: "safe" },
      ] },
      { prompt: "Team dinner — set the tone with the players.", options: [
        { label: "Big night out downtown with the whole roster", tone: "bold" },
        { label: "Let the veterans sell the culture themselves", tone: "balanced" },
        { label: "Low-key dinner with just his position group", tone: "safe" },
      ] },
      { prompt: "The closing pitch back in your office.", options: [
        { label: "Promise him a featured role from day one", tone: "bold" },
        { label: "Sell player development and the long game", tone: "balanced" },
        { label: "Talk academics, the degree, life after ball", tone: "safe" },
      ] },
    ],
  },
  HOME: {
    label: "Home Visit",
    Icon: Landmark,
    intro: "You're in his living room with the family. This one is personal.",
    perMoment: [4, 6],
    moments: [
      { prompt: "You sit down with the family. How do you open?", options: [
        { label: "Big, confident vision for his future", tone: "bold" },
        { label: "Ask about the family and really listen", tone: "balanced" },
        { label: "Hand them the facts: minutes, plan, fit", tone: "safe" },
      ] },
      { prompt: "Mom asks the hard question about playing time.", options: [
        { label: "Guarantee he starts as a freshman", tone: "bold" },
        { label: "Be honest — he'll earn it, and you'll develop him", tone: "balanced" },
        { label: "Point to how past recruits at his spot panned out", tone: "safe" },
      ] },
      { prompt: "Before you leave, you make it personal.", options: [
        { label: "Tell him he's your top priority, full stop", tone: "bold" },
        { label: "Share why you'd trust him with the ball late", tone: "balanced" },
        { label: "Leave a handwritten note and the academic plan", tone: "safe" },
      ] },
    ],
  },
};

// Roll the interest earned from one pitch choice. Bold swings wide, safe is
// tight, balanced sits between — all scaled off the per-moment base band.
function rollVisitGain(tone, base) {
  let mult;
  if (tone === "bold") mult = rand(0.45, 1.75);
  else if (tone === "safe") mult = rand(0.8, 1.05);
  else mult = rand(0.9, 1.3);
  return Math.max(1, Math.round(base * mult * INTEREST_GAIN_MULT));
}
function visitOutcomeBlurb(tone, gain, expected) {
  const ratio = gain / expected;
  if (ratio >= 1.25) return tone === "bold" ? "It lands perfectly — he's fired up." : "Goes over great.";
  if (ratio >= 0.9) return "Solid — he's nodding along.";
  if (ratio >= 0.6) return "Politely received, nothing more.";
  return tone === "bold" ? "Too much, too soon — it falls flat." : "Doesn't move the needle much.";
}

function VisitExperience({ recruit, actionKey, team, onClose, onFinish }) {
  const script = VISIT_SCRIPTS[actionKey] || VISIT_SCRIPTS.VISIT;
  const { Icon } = script;
  const [step, setStep] = useState(0);          // which moment we're on
  const [picked, setPicked] = useState(null);   // outcome of the current moment, pre-continue
  const [log, setLog] = useState([]);           // [{ prompt, choice, gain, blurb }]
  const cost = actionCostFor(actionKey, recruit, team);
  const miles = recruitDistanceMiles(recruit, team);
  const total = log.reduce((a, e) => a + e.gain, 0);
  const done = step >= script.moments.length;
  const moment = !done ? script.moments[step] : null;

  function choose(opt) {
    const base = rand(script.perMoment[0], script.perMoment[1]);
    const expected = (script.perMoment[0] + script.perMoment[1]) / 2;
    const gain = rollVisitGain(opt.tone, base);
    setPicked({ choice: opt.label, gain, blurb: visitOutcomeBlurb(opt.tone, gain, expected) });
  }
  function next() {
    if (!picked) return;
    setLog((l) => [...l, { prompt: moment.prompt, ...picked }]);
    setPicked(null);
    setStep((s) => s + 1);
  }

  const projected = clamp(recruit.interest + total, 0, 100);

  return (
    <Modal title={script.label} subtitle={`${recruit.name} · ${recruit.pos}`} onClose={onClose} maxWidth={560}>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg, border: `1px solid ${C.line}`, padding: "12px 16px", marginBottom: 16 }}>
        <Icon size={20} color={C.wood} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: C.cream }}>{recruit.hometown || recruit.state}</div>
          <div style={{ fontSize: 11, color: C.dim }}>
            {recruit.international ? "International" : miles != null ? `${Math.round(miles)} mi from campus` : "Distance unknown"} · costs {cost} pts
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>INTEREST</div>
          <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>
            {recruit.interest}{total > 0 ? <span style={{ fontSize: 13, color: C.green }}> +{total}</span> : null}
          </div>
        </div>
      </div>

      {!done ? (
        <div>
          <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: "0.08em", marginBottom: 6 }}>
            STOP {step + 1} OF {script.moments.length}
          </div>
          {step === 0 && log.length === 0 && !picked && (
            <div style={{ fontSize: 12.5, color: C.dimmer, marginBottom: 12 }}>{script.intro}</div>
          )}
          <div style={{ fontSize: 15, fontWeight: 600, color: C.cream, marginBottom: 14 }}>{moment.prompt}</div>

          {!picked ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {moment.options.map((opt, i) => (
                <button key={i} onClick={() => choose(opt)} className="cbb-btn"
                  style={{ textAlign: "left", padding: "12px 14px", border: `1px solid ${C.line}`, background: "transparent", color: C.cream, fontSize: 13.5, cursor: "pointer" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="cbb-slide-in">
              <div style={{ border: `1px solid ${C.line}`, background: C.panelAlt, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>&ldquo;{picked.choice}&rdquo;</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, color: C.cream }}>{picked.blurb}</span>
                  <span className="cbb-num" style={{ fontSize: 16, fontWeight: 700, color: C.green }}>+{picked.gain}</span>
                </div>
              </div>
              <button onClick={next} className="cbb-btn" style={{ ...btnStyle(C.wood), width: "100%", justifyContent: "center", fontSize: 14 }}>
                {step + 1 < script.moments.length ? "Next stop" : "Wrap up the visit"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="cbb-slide-in">
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.wood, letterSpacing: "0.1em" }}>VISIT COMPLETE</div>
            <div className="cbb-num" style={{ fontSize: 34, fontWeight: 700, color: C.green, lineHeight: 1.1 }}>+{total} interest</div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 4 }}>
              {recruit.name}&apos;s interest climbs to <span style={{ color: C.gold }}>{projected}</span>.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {log.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: C.dimmer, borderBottom: `1px solid ${C.line}`, paddingBottom: 6 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.choice}</span>
                <span className="cbb-num" style={{ color: C.green }}>+{e.gain}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onFinish(total)} className="cbb-btn" style={{ ...btnStyle(C.gold, "#221a00"), width: "100%", justifyContent: "center", fontSize: 14 }}>
            <Check size={14} /> Finish Visit ({cost} pts)
          </button>
        </div>
      )}
    </Modal>
  );
}

function LiveGame({ ctxInit, onFinish, onClose }) {
  const T = TEMPO_POSS.balanced; // possessions per team are locked at tip from tempo
  const [ctx] = useState(() => {
    const myPower = userGamePower(ctxInit.roster, ctxInit.dc, ctxInit.powerBaseline) + ctxInit.momentum;
    return {
      roster: ctxInit.roster, dc: ctxInit.dc, oppName: ctxInit.opp.name,
      oppPower: ctxInit.oppPower, myPower, tend: liveTendencies(ctxInit.roster, ctxInit.dc),
    };
  });
  const [tempo, setTempo] = useState("balanced");
  const [started, setStarted] = useState(false);
  const [g, setG] = useState(() => ({
    my: 0, opp: 0, event: 0, fatigue: 0, boostPoss: 0, oppRun: 0,
    timeouts: 5, log: [], finished: false, inOT: false,
    gp: { tempo: "balanced", offFocus: "balanced", defScheme: "balanced" },
  }));
  const totalPoss = TEMPO_POSS[tempo];
  const gctx = useMemo(() => ({ ...ctx, T: totalPoss }), [ctx, totalPoss]);

  function tip() {
    setG((s) => ({ ...s, gp: { ...s.gp, tempo } }));
    setStarted(true);
  }
  function runN(n) {
    setG((s) => {
      let next = s;
      for (let i = 0; i < n && !next.finished; i++) next = stepLive(next, gctx);
      return next;
    });
  }
  function playToFinal() {
    setG((s) => {
      let next = s, guard = 0;
      while (!next.finished && guard < 400) { next = stepLive(next, gctx); guard++; }
      return next;
    });
  }
  function toMediaTimeout() {
    const chunk = Math.max(4, Math.round(totalPoss / 5));
    runN(chunk * 2);
  }
  function callTimeout() {
    setG((s) => (s.timeouts <= 0 ? s : { ...s, timeouts: s.timeouts - 1, boostPoss: 4, oppRun: 0, fatigue: clamp(s.fatigue - 1, 0, 4), log: [{ id: `to${s.event}`, my: s.my, opp: s.opp, text: "Timeout — you settle the group down", half: s.event > totalPoss ? 2 : 1, timeout: true }, ...s.log] }));
  }
  function setPlan(key, val) { setG((s) => ({ ...s, gp: { ...s.gp, [key]: val } })); }

  const clock = fmtClock(g, totalPoss);
  const leading = g.my > g.opp;
  const oppOnRun = g.oppRun >= 6 && g.timeouts > 0 && !g.finished;

  function finish() {
    const win = g.my > g.opp;
    onFinish({ win, myScore: g.my, oppScore: g.opp, boxByPlayer: genLiveBox(ctx.roster, ctx.dc, g.my) });
  }

  return (
    <Modal title="Coach Mode" subtitle={`${ctxInit.home ? "vs" : "at"} ${ctx.oppName}`} onClose={onClose} maxWidth={720}>
      {/* Scoreboard */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, border: `1px solid ${C.line}`, padding: "16px 22px", marginBottom: 16 }}>
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.06em" }}>{TEAM_MAP[ctxInit.teamId]?.name || "YOU"}</div>
          <div className="cbb-num" style={{ fontSize: 44, fontWeight: 700, color: leading ? C.gold : C.cream, lineHeight: 1 }}>{g.my}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="cbb-num" style={{ fontSize: 13, color: C.wood, fontWeight: 700 }}>{g.inOT ? "OT" : `${clock.half === 1 ? "1ST" : "2ND"} HALF`}</div>
          <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}><Clock size={14} color={C.dim} />{g.inOT ? "0:00" : clock.label}</div>
          <div style={{ fontSize: 10.5, color: C.dimmer, marginTop: 3 }}>TO left: {g.timeouts}</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.06em" }}>{ctx.oppName}</div>
          <div className="cbb-num" style={{ fontSize: 44, fontWeight: 700, color: !leading && g.opp > g.my ? C.red : C.cream, lineHeight: 1 }}>{g.opp}</div>
        </div>
      </div>

      {!started ? (
        <div>
          <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 8 }}>Set your tempo before tip-off. Fast play creates more possessions (and more variance — good if you're the underdog); a slow pace shortens the game and protects a talent edge.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <PlanButton active={tempo === "slow"} onClick={() => setTempo("slow")}>Slow (58)</PlanButton>
            <PlanButton active={tempo === "balanced"} onClick={() => setTempo("balanced")}>Balanced (65)</PlanButton>
            <PlanButton active={tempo === "fast"} onClick={() => setTempo("fast")}>Fast (73)</PlanButton>
          </div>
          <button onClick={tip} className="cbb-btn" style={{ ...btnStyle(C.gold, "#221a00"), width: "100%", justifyContent: "center", fontSize: 14 }}><Play size={14} /> Tip Off</button>
        </div>
      ) : (
        <div>
          {/* Live game plan controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: "0.06em", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}><Gauge size={12} /> OFFENSE</div>
              <div style={{ display: "flex", gap: 6 }}>
                <PlanButton active={g.gp.offFocus === "inside"} onClick={() => setPlan("offFocus", "inside")}>Inside</PlanButton>
                <PlanButton active={g.gp.offFocus === "balanced"} onClick={() => setPlan("offFocus", "balanced")}>Balanced</PlanButton>
                <PlanButton active={g.gp.offFocus === "perimeter"} onClick={() => setPlan("offFocus", "perimeter")}>Perimeter</PlanButton>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: "0.06em", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}><ShieldCheck size={12} /> DEFENSE</div>
              <div style={{ display: "flex", gap: 6 }}>
                <PlanButton active={g.gp.defScheme === "press"} onClick={() => setPlan("defScheme", "press")}>Press</PlanButton>
                <PlanButton active={g.gp.defScheme === "balanced"} onClick={() => setPlan("defScheme", "balanced")}>Balanced</PlanButton>
                <PlanButton active={g.gp.defScheme === "pack"} onClick={() => setPlan("defScheme", "pack")}>Pack</PlanButton>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.dimmer, marginBottom: 12 }}>
            {g.gp.offFocus === "inside" && (ctx.tend.inside > ctx.tend.perimeter ? "Feeding the post — plays to your frontcourt." : "Your bigs aren't built for this — forcing it inside is costing you.")}
            {g.gp.offFocus === "perimeter" && (ctx.tend.perimeter > ctx.tend.inside ? "Letting it fly — plays to your shooters." : "You're jacking threes you can't make.")}
            {g.gp.offFocus === "balanced" && "Taking what the defense gives you."}
            {" · "}
            {g.gp.defScheme === "press" && "Full-court press: rattles the opponent but wears your legs down."}
            {g.gp.defScheme === "pack" && "Pack-line: runs shooters off the arc, softer on the glass."}
            {g.gp.defScheme === "balanced" && "Straight man-to-man."}
          </div>

          {oppOnRun && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Flame size={13} /> {ctx.oppName} is on a {g.oppRun}-0 run — consider a timeout.
            </div>
          )}

          {/* Controls */}
          {!g.finished ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={() => runN(2)} className="cbb-btn" style={btnStyle(C.wood)}><Play size={13} /> Run Possession</button>
              <button onClick={toMediaTimeout} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><FastForward size={13} /> To Media Timeout</button>
              <button onClick={callTimeout} disabled={g.timeouts <= 0} className="cbb-btn" style={{ ...btnStyle(oppOnRun ? C.gold : C.panelAlt, oppOnRun ? "#221a00" : C.cream), opacity: g.timeouts <= 0 ? 0.4 : 1 }}><Timer size={13} /> Timeout</button>
              <button onClick={playToFinal} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><Zap size={13} /> Play to Final</button>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div className="cbb-num" style={{ fontSize: 18, fontWeight: 700, color: g.my > g.opp ? C.green : C.red, marginBottom: 8 }}>
                {g.my > g.opp ? "WIN" : "LOSS"} — {g.my}-{g.opp}
              </div>
              <button onClick={finish} className="cbb-btn" style={{ ...btnStyle(C.gold, "#221a00"), width: "100%", justifyContent: "center", fontSize: 14 }}><Check size={14} /> Final — Confirm Result</button>
            </div>
          )}

          {/* Play-by-play */}
          <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: "0.06em", marginBottom: 6 }}>PLAY-BY-PLAY</div>
          <div className="cbb-scroll" style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${C.line}` }}>
            {g.log.length === 0 && <div style={{ padding: 12, fontSize: 12, color: C.dimmer }}>Tip-off. Run a possession to get started.</div>}
            {g.log.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 12, background: l.timeout ? C.panelAlt : "transparent" }}>
                <span style={{ color: l.timeout ? C.gold : l.offMe ? C.cream : C.dim }}>{l.text}</span>
                <span className="cbb-num" style={{ color: C.dimmer, flexShrink: 0 }}>{l.my}-{l.opp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Opponent Roster Viewer ---------- */
function TeamRosterModal({ teamId, year, strengths, rank, poached = [], onClose }) {
  const team = TEAM_MAP[teamId];
  const [view, setView] = useState("roster");
  // Any real player the user has signed away from THIS team no longer appears
  // on their roster — otherwise a poached recruit shows up in two places at once.
  const poachedHere = useMemo(
    () => new Set(poached.filter((p) => p.teamId === teamId).map((p) => p.name)),
    [poached, teamId]
  );
  const roster = useMemo(() => {
    const r = buildInitialRoster(team, year).filter((p) => !(p.realKey && poachedHere.has(p.realKey)));
    return [...r].sort((a, b) => b.overall - a.overall);
  }, [teamId, year, poachedHere]);
  const schedule = useMemo(() => genSchedule(team, year), [teamId, year]);
  const teamPower = useMemo(() => teamPowerRating(team, strengths, year, { noise: false }), [teamId, year, strengths]);
  const realCount = roster.filter((p) => p.realName).length;
  // Real season-by-season records (Barttorvik), newest first.
  const history = useMemo(() => {
    const rec = teamRecordsRaw[teamId] || {};
    return Object.keys(rec)
      .map((y) => ({ year: +y, ...rec[y] }))
      .sort((a, b) => b.year - a.year);
  }, [teamId]);

  const tabBtn = (id, label) => (
    <button
      onClick={() => setView(id)}
      className="cbb-btn"
      style={{
        cursor: "pointer", padding: "5px 14px", fontSize: 12.5, fontWeight: 600,
        background: view === id ? C.wood : "transparent",
        border: `1px solid ${view === id ? C.wood : C.line}`,
        color: view === id ? "#1a1206" : C.dim,
      }}
    >
      {label}
    </button>
  );

  return (
    <Modal
      title={rank && rank <= 25 ? `#${rank} ${team.name}` : team.name}
      subtitle={`${team.conf} · projected ${seasonLabel(year)}${rank && rank <= 25 ? ` · ranked #${rank}` : ""}`}
      onClose={onClose}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, background: team.primary }} />
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ width: 14, height: 4, background: i < team.prestige ? C.wood : C.line }} />
          ))}
        </div>
        {realCount > 0 && (
          <span style={{ fontSize: 11, color: C.dimmer, marginLeft: 4 }}>
            {realCount} real names from Torvik data (•)
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {tabBtn("roster", "Roster")}
        {tabBtn("schedule", "Schedule")}
        {history.length > 0 && tabBtn("history", "Program History")}
      </div>

      {view === "roster" && (
        <Panel style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
                <th style={th}>Player</th><th style={th}>Pos</th><th style={th}>Class</th><th style={th}>OVR</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{p.realName ? "• " : ""}{p.name}</div>
                    {p.starsAtSigning != null && <StarRow stars={p.starsAtSigning} />}
                  </td>
                  <td style={td}>{p.pos}</td>
                  <td style={td}>{p.class}</td>
                  <td style={{ ...td, fontWeight: 700 }} className="cbb-num">{p.overall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {view === "schedule" && (
        <Panel style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
                <th style={th}>Wk</th><th style={th}>Opponent</th><th style={th}>Site</th><th style={th}>Proj</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((g) => {
                const opp = TEAM_MAP[g.oppId];
                const oppPower = teamPowerRating(opp, strengths, year, { noise: false });
                // Home court nudges the projection a touch in the team's favor.
                const edge = g.home ? 3 : -3;
                const winProb = gameWinProb(teamPower + edge, oppPower);
                const favored = winProb >= 0.5;
                return (
                  <tr key={g.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={td}>{g.week}</td>
                    <td style={td}>
                      {opp.name}
                      <span style={{ color: C.dimmer, fontSize: 11, marginLeft: 6 }}>({opp.conf})</span>
                      {g.conf && <span style={{ color: C.wood, fontSize: 10, marginLeft: 6, letterSpacing: "0.06em" }}>CONF</span>}
                    </td>
                    <td style={td}>{g.home ? "Home" : "Away"}</td>
                    <td style={{ ...td, fontWeight: 600, color: favored ? C.green : C.red }}>
                      {favored ? "W" : "L"} <span style={{ color: C.dimmer, fontWeight: 400, fontSize: 11 }}>{Math.round(winProb * 100)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {view === "history" && (
        <Panel style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: C.dimmer, padding: "8px 10px 0" }}>
            Real season results from Torvik data. Rk = end-of-season national rating rank.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
                <th style={th}>Season</th><th style={th}>Overall</th><th style={th}>Conf</th><th style={th}>Conf W-L</th><th style={th}>Rk</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.year} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ ...td, fontWeight: 600 }} className="cbb-num">{seasonLabel(h.year)}</td>
                  <td style={{ ...td, fontWeight: 700 }} className="cbb-num">{h.wl}</td>
                  <td style={td}>{h.conf}</td>
                  <td style={td} className="cbb-num">{h.confWL || "—"}</td>
                  <td style={{ ...td, color: h.rank <= 25 ? C.wood : C.dim, fontWeight: h.rank <= 25 ? 700 : 400 }} className="cbb-num">
                    {h.rank <= 25 ? `#${h.rank}` : h.rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </Modal>
  );
}

/* ---------- Coaching Job Change ---------- */
function JobChangeModal({ currentTeamId, nextYear, reputation = 0, onPick, onClose }) {
  const [q, setQ] = useState("");
  const filtered = TEAMS
    .filter((t) => t.id !== currentTeamId && t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));

  return (
    <Modal
      title="Take another job"
      subtitle={`Leave your program to coach a new team starting in ${seasonLabel(nextYear)}. Bigger programs only hire coaches with the reputation to match — you have ${reputation} (${reputationTier(reputation)}). Your current roster stays behind.`}
      onClose={onClose}
      maxWidth={860}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search programs…"
        style={{ width: "100%", background: C.panelAlt, border: `1px solid ${C.line}`, color: C.cream, padding: "10px 14px", fontSize: 14, marginBottom: 16, outline: "none" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {filtered.map((t) => {
          const req = JOB_REP_REQ[t.prestige] ?? 0;
          const locked = reputation < req;
          return (
            <button
              key={t.id}
              onClick={() => !locked && onPick(t)}
              disabled={locked}
              className="cbb-btn"
              style={{
                textAlign: "left", cursor: locked ? "not-allowed" : "pointer", padding: "14px 12px",
                background: C.panelAlt, border: `1px solid ${C.line}`, borderLeft: `4px solid ${locked ? C.line : t.primary}`,
                color: locked ? C.dimmer : C.cream, display: "flex", flexDirection: "column", gap: 6, opacity: locked ? 0.7 : 1,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {locked && <Lock size={12} />} {t.name}
              </div>
              <div style={{ fontSize: 11.5, color: C.dim }}>{t.conf}</div>
              <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: 12, height: 4, background: i < t.prestige ? (locked ? C.dimmer : C.wood) : C.line }} />
                ))}
              </div>
              {locked && <div style={{ fontSize: 10.5, color: C.red }}>Needs {req} reputation</div>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------- Player Profile ---------- */
function AttrBar({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 88, fontSize: 11.5, color: C.dim }}>{label}</div>
      <div style={{ flex: 1, height: 7, background: C.line, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, width: `${clamp(value, 0, 99)}%`, background: value >= 80 ? C.gold : value >= 65 ? C.wood : C.dim }} />
      </div>
      <div className="cbb-num" style={{ width: 26, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function PlayerModal({ player, onClose }) {
  if (!player) return null;
  const p = player;
  const s = p.season, c = p.career;
  const careerGp = c.gp + s.gp;
  return (
    <Modal title={p.name} subtitle={`${p.pos} · ${p.class} · ${p.height} · OVR ${p.overall}${p.realName ? " · real player" : ""}`} onClose={onClose} maxWidth={620}>
      {isHurt(p) && (
        <div style={{ marginBottom: 14, padding: "8px 12px", border: `1px solid ${C.red}`, color: C.red, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
          <HeartPulse size={13} /> Injured — out {p.injuredGames} game{p.injuredGames > 1 ? "s" : ""}
        </div>
      )}
      {p.starsAtSigning != null && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: C.dim }}>Recruiting grade</span>
          <StarRow stars={p.starsAtSigning} />
          {p.ratingAtSigning != null && <span className="cbb-num" style={{ fontSize: 11.5, color: C.dimmer }}>{p.ratingAtSigning.toFixed(3)}</span>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>ATTRIBUTES</div>
          {ATTR_KEYS.map((k) => <AttrBar key={k} label={ATTR_LABELS[k]} value={p.attrs[k] ?? 40} />)}
          <AttrBar label="Potential" value={p.attrs.potential} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>PRODUCTION (PER GAME)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.dim, fontSize: 11, textAlign: "left" }}>
                <th style={{ padding: "4px 6px" }}></th><th style={{ padding: "4px 6px" }}>GP</th>
                <th style={{ padding: "4px 6px" }}>PPG</th><th style={{ padding: "4px 6px" }}>RPG</th><th style={{ padding: "4px 6px" }}>APG</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "6px 6px", color: C.dim }}>Season</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{s.gp}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(s.pts, s.gp)}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(s.reb, s.gp)}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(s.ast, s.gp)}</td>
              </tr>
              <tr style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "6px 6px", color: C.dim }}>Career</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{careerGp}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(c.pts + s.pts, careerGp)}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(c.reb + s.reb, careerGp)}</td>
                <td className="cbb-num" style={{ padding: "6px 6px" }}>{avg(c.ast + s.ast, careerGp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Box Score ---------- */
function BoxScoreModal({ game, teamName, onClose }) {
  if (!game || !game.result || !game.result.box) return null;
  const opp = TEAM_MAP[game.oppId];
  const r = game.result;
  return (
    <Modal
      title={`${r.win ? "W" : "L"} ${r.myScore}-${r.oppScore} ${game.home ? "vs" : "at"} ${opp.name}`}
      subtitle={`Week ${game.week}${r.oppRank ? ` · No. ${r.oppRank} ${opp.name}` : ""} · ${teamName} box score`}
      onClose={onClose}
      maxWidth={560}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
            <th style={th}>Player</th><th style={th}>Pos</th><th style={th}>MIN</th><th style={th}>PTS</th><th style={th}>REB</th><th style={th}>AST</th>
          </tr>
        </thead>
        <tbody>
          {r.box.map((b, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
              <td style={{ ...td, fontWeight: 600 }}>{b.name}</td>
              <td style={td}>{b.pos}</td>
              <td className="cbb-num" style={td}>{b.min}</td>
              <td className="cbb-num" style={{ ...td, fontWeight: 700 }}>{b.pts}</td>
              <td className="cbb-num" style={td}>{b.reb}</td>
              <td className="cbb-num" style={td}>{b.ast}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* ---------- Season Recap ---------- */
function SeasonRecapModal({ recap, onClose }) {
  if (!recap) return null;
  const a = recap.awards || {};
  const repDelta = recap.repAfter - recap.repBefore;
  return (
    <Modal title={`${seasonLabel(recap.year)} Season Recap`} subtitle={`${recap.teamName} finished ${recap.record.w}-${recap.record.l}`} onClose={onClose} maxWidth={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <RecapChip label="Record" value={`${recap.record.w}-${recap.record.l}`} />
          <RecapChip label="Postseason" value={recap.postseason || "None"} gold={recap.postseason === "National Champions"} />
          <RecapChip label="Reputation" value={`${recap.repAfter}${repDelta ? ` (+${repDelta})` : ""}`} />
          <RecapChip label="Incoming class" value={`${recap.incomingCount} signed`} />
        </div>

        {a.userHonors && a.userHonors.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Medal size={13} /> YOUR PLAYERS HONORED</div>
            {a.userHonors.map((h, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{h.name}</span> <span style={{ color: C.dim }}>({h.pos})</span> — {h.honors.join(", ")}
              </div>
            ))}
          </div>
        )}

        {a.poy && (
          <div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 8 }}>NATIONAL PLAYER OF THE YEAR</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: a.poy.isUser ? C.gold : C.cream }}>
              {a.poy.name} <span style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>{a.poy.pos} · {a.poy.teamName}</span>
            </div>
          </div>
        )}

        {a.allAmerica && a.allAmerica.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 8 }}>ALL-AMERICA FIRST TEAM</div>
            {a.allAmerica.map((c, i) => (
              <div key={i} style={{ fontSize: 12.5, marginBottom: 2, color: c.isUser ? C.gold : C.cream }}>
                {c.name} <span style={{ color: C.dim }}>{c.pos} · {c.teamName} · {c.ppg.toFixed(1)} / {c.rpg.toFixed(1)} / {c.apg.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {recap.draft && recap.draft.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={13} /> LEAVING FOR THE NBA DRAFT</div>
            {recap.draft.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, marginBottom: 2 }}>
                <span className="cbb-num" style={{ color: C.wood }}>#{d.pick}</span> {d.name} <span style={{ color: C.dim }}>{d.pos} · OVR {d.overall} · {d.early ? `${d.class} (early entry)` : "senior"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 20, textAlign: "right" }}>
        <button onClick={onClose} className="cbb-btn" style={btnStyle(C.wood)}>Continue</button>
      </div>
    </Modal>
  );
}
function RecapChip({ label, value, gold }) {
  return (
    <div style={{ border: `1px solid ${gold ? C.gold : C.line}`, padding: "8px 12px", minWidth: 96 }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
      <div className="cbb-num" style={{ fontSize: 14, fontWeight: 700, color: gold ? C.gold : C.cream, marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ---------- Program (career, trophy case, records) ---------- */
function ProgramTab({ state, team, record, reputation, rivalIds, rankById }) {
  const coach = state.coach || EMPTY_COACH;
  const careerW = coach.wins, careerL = coach.losses;
  const winPct = careerW + careerL > 0 ? (careerW / (careerW + careerL)).toFixed(3).replace(/^0/, "") : "—";
  const sigWins = state.schedule.filter((g) => g.played && g.result.win && g.result.oppRank && g.result.oppRank <= 25);
  const awardsHistory = state.awardsHistory || [];
  const draftHistory = state.draftHistory || [];
  const ledger = state.rivalryLedger || {};
  const rivals = [...rivalIds].map((id) => ({ id, name: TEAM_MAP[id]?.name, rec: ledger[id] })).filter((r) => r.name);
  const prestige = Math.round(team.prestige || 2);
  const trend = state.prestigeTrendById?.[state.teamId] ?? 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? C.green : trend < 0 ? C.red : C.dim;
  const trendText = trend > 0 ? "Trending up" : trend < 0 ? "Trending down" : "Holding steady";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 940 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatBlock label="Career Record" value={`${careerW}-${careerL}`} />
        <StatBlock label="Win %" value={winPct} />
        <StatBlock label="Seasons" value={coach.seasons} />
        <StatBlock label="Reputation" value={reputation} />
      </div>

      <Panel style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 4 }}>PROGRAM TRAJECTORY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="cbb-num" style={{ fontSize: 22, fontWeight: 700 }}>Prestige {prestige}</span>
              <StarRow stars={prestige} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: trendColor, fontSize: 13, fontWeight: 600 }}>
            <TrendIcon size={16} /> {trendText}
          </div>
        </div>
      </Panel>

      <Panel style={{ padding: 20 }}>
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Trophy size={13} color={C.gold} /> TROPHY CASE</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <TrophyBadge count={coach.natTitles} label="National Titles" gold />
          <TrophyBadge count={coach.finalFours} label="Final Fours" />
          <TrophyBadge count={coach.confTourneyTitles} label="Conf. Tournament Titles" />
          <TrophyBadge count={coach.tourneyApps} label="NCAA Appearances" />
        </div>
        <div style={{ fontSize: 11.5, color: C.dimmer, marginTop: 12 }}>
          {reputationTier(reputation)} — {reputation} reputation. Win games, make deep tournament runs, and cut down nets to unlock jobs at blue-blood programs.
        </div>
      </Panel>

      <Panel style={{ padding: 20 }}>
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Flame size={13} color={C.wood} /> SIGNATURE WINS · {seasonLabel(state.year)}</div>
        {sigWins.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sigWins.map((g) => (
              <div key={g.id} style={{ fontSize: 13 }}>
                <span style={{ color: C.green, fontWeight: 600 }}>W {g.result.myScore}-{g.result.oppScore}</span>{" "}
                <span style={{ color: C.dim }}>{g.home ? "vs" : "at"}</span>{" "}
                <span style={{ fontWeight: 600 }}>No. {g.result.oppRank} {TEAM_MAP[g.oppId].name}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: 12.5, color: C.dimmer }}>No wins over ranked teams yet this season.</div>}
      </Panel>

      {rivals.length > 0 && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Swords size={13} color={C.red} /> RIVALRY LEDGER</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {rivals.map((r) => {
              const w = r.rec?.w || 0, l = r.rec?.l || 0;
              const edge = w > l ? C.green : l > w ? C.red : C.dim;
              return (
                <div key={r.id} style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${edge}`, padding: "10px 14px", minWidth: 150 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div className="cbb-num" style={{ fontSize: 20, fontWeight: 700, color: edge, marginTop: 2 }}>{w}-{l}</div>
                  <div style={{ fontSize: 10.5, color: C.dimmer }}>
                    {w + l === 0 ? "No meetings yet" : w > l ? "You lead the series" : l > w ? "You trail the series" : "Series is even"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: C.dimmer, marginTop: 12 }}>Head-to-head records against your conference rivals, tracked across seasons at this program.</div>
        </Panel>
      )}

      {state.history.length > 0 && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12 }}>SEASON BY SEASON</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
                <th style={th}>Season</th><th style={th}>Program</th><th style={th}>Record</th><th style={th}>Postseason</th><th style={th}>Team POY</th>
              </tr>
            </thead>
            <tbody>
              {[...state.history].reverse().map((h) => {
                const title = h.postseason === "National Champions";
                const poy = h.awards && h.awards.poy && h.awards.poy.isUser ? h.awards.poy.name : null;
                return (
                  <tr key={h.year} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="cbb-num" style={td}>{seasonLabel(h.year)}</td>
                    <td style={td}>{TEAM_MAP[h.teamId]?.name || "—"}</td>
                    <td className="cbb-num" style={td}>{h.wins}-{h.losses}</td>
                    <td style={{ ...td, color: title ? C.gold : h.postseason ? C.wood : C.dimmer }}>{h.postseason || "—"}</td>
                    <td style={{ ...td, color: poy ? C.gold : C.dimmer }}>{poy || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {awardsHistory.length > 0 && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Medal size={13} color={C.gold} /> PLAYER HONORS</div>
          {[...awardsHistory].reverse().map((yr, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div className="cbb-num" style={{ fontSize: 12, color: C.dim, marginBottom: 3 }}>{seasonLabel(yr.year)} · {yr.teamName}</div>
              {yr.honors.map((h, j) => (
                <div key={j} style={{ fontSize: 12.5 }}>
                  <span style={{ fontWeight: 600 }}>{h.name}</span> <span style={{ color: C.dim }}>({h.pos})</span> — {h.honors.join(", ")}
                </div>
              ))}
            </div>
          ))}
        </Panel>
      )}

      {draftHistory.length > 0 && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={13} color={C.wood} /> NBA DRAFT PIPELINE</div>
          {[...draftHistory].reverse().map((yr, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div className="cbb-num" style={{ fontSize: 12, color: C.dim, marginBottom: 3 }}>{seasonLabel(yr.year)}</div>
              {yr.picks.map((d, j) => (
                <div key={j} style={{ fontSize: 12.5 }}>
                  <span className="cbb-num" style={{ color: C.wood }}>#{d.pick}</span> {d.name} <span style={{ color: C.dim }}>{d.pos} · {d.early ? `${d.class} early entry` : "senior"}</span>
                </div>
              ))}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
function TrophyBadge({ count, label, gold }) {
  const has = count > 0;
  return (
    <div style={{ border: `1px solid ${has && gold ? C.gold : has ? C.wood : C.line}`, padding: "10px 14px", minWidth: 120, opacity: has ? 1 : 0.55 }}>
      <div className="cbb-num" style={{ fontSize: 24, fontWeight: 700, color: has && gold ? C.gold : has ? C.wood : C.dimmer }}>{count}</div>
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ScheduleRow({ g, teamConf, rankById, isRival, onViewTeam, onEditGame, onViewBox, takenOppIds }) {
  const [editing, setEditing] = useState(false);
  const opp = TEAM_MAP[g.oppId];
  const editable = !g.conf && !g.played && !!onEditGame;
  const signature = g.played && g.result.win && g.result.oppRank && g.result.oppRank <= 25;
  const hasBox = g.played && g.result.box && g.result.box.length > 0;
  // Non-conference opponents = every program outside your conference that
  // isn't already booked elsewhere in the non-con slate (each school once).
  const options = editable
    ? TEAMS.filter((t) => t.conf !== teamConf && (t.id === g.oppId || !takenOppIds?.has(t.id))).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <tr className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
      <td style={td}>{g.week}</td>
      <td style={td}>
        {editing ? (
          <select
            value={g.oppId}
            autoFocus
            onChange={(e) => { onEditGame(g.id, { oppId: e.target.value }); setEditing(false); }}
            onBlur={() => setEditing(false)}
            style={{ background: C.panelAlt, border: `1px solid ${C.wood}`, color: C.cream, padding: "4px 6px", fontSize: 13, maxWidth: 220 }}
          >
            {options.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.conf})</option>
            ))}
          </select>
        ) : (
          <span onClick={() => onViewTeam(g.oppId)} style={{ cursor: "pointer" }}>
            <RankBadge rank={rankById?.[g.oppId]} />
            <span style={{ borderBottom: `1px dotted ${C.dim}` }}>{opp.name}</span>
          </span>
        )}
        <span style={{ color: C.dimmer, fontSize: 11, marginLeft: 6 }}>({opp.conf})</span>
        {g.conf && <span style={{ color: C.wood, fontSize: 10, marginLeft: 6, letterSpacing: "0.06em" }}>CONF</span>}
        {isRival && <span style={{ color: C.red, fontSize: 10, marginLeft: 6, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 3 }}><Swords size={11} /> RIVALRY</span>}
      </td>
      <td style={td}>
        {editable ? (
          <button
            onClick={() => onEditGame(g.id, { home: !g.home })}
            className="cbb-btn"
            style={{ background: C.panelAlt, border: `1px solid ${C.line}`, color: C.cream, padding: "3px 9px", fontSize: 12, cursor: "pointer" }}
          >
            {g.home ? "Home" : "Away"}
          </button>
        ) : (g.home ? "Home" : "Away")}
      </td>
      <td style={td}>
        {g.played ? (
          <span
            onClick={() => hasBox && onViewBox && onViewBox(g.id)}
            style={{ color: g.result.win ? C.green : C.red, fontWeight: 600, cursor: hasBox ? "pointer" : "default" }}
          >
            {g.result.win ? "W" : "L"} {g.result.myScore}-{g.result.oppScore}
            {signature && <Star size={11} fill={C.gold} color={C.gold} style={{ marginLeft: 5, verticalAlign: "middle" }} />}
          </span>
        ) : <span style={{ color: C.dimmer }}>—</span>}
      </td>
      <td style={{ ...td, textAlign: "right" }}>
        {editable ? (
          <button
            onClick={() => setEditing((v) => !v)}
            className="cbb-btn"
            style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, padding: "3px 9px", fontSize: 11.5, cursor: "pointer" }}
          >
            {editing ? "Close" : "Change"}
          </button>
        ) : hasBox ? (
          <button
            onClick={() => onViewBox && onViewBox(g.id)}
            className="cbb-btn"
            style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, padding: "3px 9px", fontSize: 11.5, cursor: "pointer" }}
          >
            Box
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function ScheduleTab({ schedule, teamConf, rankById, rivalIds, onViewTeam, onEditGame, onViewBox }) {
  const nonConf = schedule.filter((g) => !g.conf);
  const conf = schedule.filter((g) => g.conf);
  const takenOppIds = new Set(nonConf.map((g) => g.oppId));

  const table = (games, editable) => (
    <Panel style={{ overflow: "hidden", marginBottom: 18 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
            <th style={th}>Wk</th><th style={th}>Opponent</th><th style={th}>Site</th><th style={th}>Result</th><th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <ScheduleRow key={g.id} g={g} teamConf={teamConf} rankById={rankById}
              isRival={rivalIds && rivalIds.has(g.oppId)} takenOppIds={takenOppIds}
              onViewTeam={onViewTeam} onEditGame={editable ? onEditGame : null} onViewBox={onViewBox} />
          ))}
        </tbody>
      </table>
    </Panel>
  );

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
        Non-conference games are yours to schedule — use <strong>Change</strong> to pick an opponent or flip home/away before you play them. Your conference slate is locked. Click any opponent to preview their roster.
      </div>
      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>NON-CONFERENCE</div>
      {table(nonConf, true)}
      <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>CONFERENCE</div>
      {table(conf, false)}
    </div>
  );
}

/* ---------- Standings ---------- */
function StandingsTab({ team, ranked, rankById, userRecord, onViewTeam }) {
  // Standings read the SAME accrued records the poll uses: each CPU team's record
  // is the running result of its emergent season through the games played so far
  // (0-0 before week 1, filling in as games finish), and the user's row is their
  // real played record. No proportional guessing — poll and standings always match.
  const gamesPlayed = Math.max(0, (userRecord.w || 0) + (userRecord.l || 0));

  // Conference filter: "All" shows the national table; picking a league narrows
  // it to that conference's members and re-numbers them as a standalone standing.
  const [confFilter, setConfFilter] = useState("All");
  const confOptions = useMemo(
    () => [...new Set(ranked.map((r) => r.team.conf))].sort((a, b) => a.localeCompare(b)),
    [ranked]
  );

  const rows = ranked
    .map((r) => ({ ...r.team, wins: r.wins, losses: r.losses, isUser: r.team.id === team.id }))
    .filter((t) => confFilter === "All" || t.conf === confFilter)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.prestige - a.prestige);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: C.dimmer, flex: "1 1 240px" }}>
          {confFilter === "All"
            ? <>National standings through the games played so far — every team shows the same {gamesPlayed} game{gamesPlayed === 1 ? "" : "s"} you&apos;ve played, and each season plays out fresh, so records and the poll shift week to week. Click any team to preview their roster.</>
            : <><strong>{confFilter}</strong> standings through {gamesPlayed} game{gamesPlayed === 1 ? "" : "s"} — live results from each team&apos;s emergent season. Click any team to preview their roster.</>}
        </span>
        <select value={confFilter} onChange={(e) => setConfFilter(e.target.value)}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value="All">All conferences</option>
          {confOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Panel style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
              <th style={th}>#</th><th style={th}>Team</th><th style={th}>Conf</th><th style={th}>W</th><th style={th}>L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}`, background: t.isUser ? C.panelAlt : "transparent", cursor: "pointer" }} onClick={() => onViewTeam(t.id)}>
                <td style={td}>{i + 1}</td>
                <td style={{ ...td, fontWeight: t.isUser ? 700 : 500 }}>
                  <RankBadge rank={rankById[t.id]} />
                  <span style={{ borderBottom: t.isUser ? "none" : `1px dotted ${C.dim}` }}>{t.name}</span>{t.isUser ? " (you)" : ""}
                </td>
                <td style={td}>{t.conf}</td>
                <td style={td} className="cbb-num">{t.wins}</td>
                <td style={td} className="cbb-num">{t.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------- Rankings ---------- */
// A #N chip shown next to top-25 teams throughout the app.
function RankBadge({ rank, size = "sm" }) {
  if (!rank || rank > 25) return null;
  const big = size === "lg";
  return (
    <span
      className="cbb-num"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: big ? 30 : 22, height: big ? 30 : 18, padding: "0 5px",
        marginRight: 8, background: C.wood, color: "#1a1206",
        fontSize: big ? 15 : 11, fontWeight: 700, verticalAlign: "middle",
      }}
    >
      {rank}
    </span>
  );
}

function RankingsTab({ ranked, userTeamId, onViewTeam }) {
  const [showAll, setShowAll] = useState(false);
  const top25 = ranked.slice(0, 25);
  const rest = ranked.slice(25);

  const row = (r, i) => {
    const isUser = r.team.id === userTeamId;
    return (
      <tr key={r.team.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}`, background: isUser ? C.panelAlt : "transparent", cursor: "pointer" }} onClick={() => onViewTeam(r.team.id)}>
        <td style={{ ...td, width: 44 }}>
          <span className="cbb-num" style={{ fontSize: 17, fontWeight: 700, color: i < 25 ? C.wood : C.dim }}>{i + 1}</span>
        </td>
        <td style={{ ...td, fontWeight: isUser ? 700 : 500 }}>
          <span style={{ borderBottom: isUser ? "none" : `1px dotted ${C.dim}` }}>{r.team.name}</span>{isUser ? " (you)" : ""}
        </td>
        <td style={{ ...td, color: C.dim }}>{r.team.conf}</td>
        <td style={td} className="cbb-num">{r.wins}-{r.losses}</td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 14, maxWidth: 720 }}>
        AP-style Top 25 — a blend of win percentage and team quality, so blue bloods with strong records rank high while a dominant mid-major that keeps winning can climb into the poll. Rankings drive tournament seeding. Click any team to preview them.
      </div>
      <Panel style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
              <th style={{ ...th, width: 44 }}>Rk</th><th style={th}>Team</th><th style={th}>Conf</th><th style={th}>Record</th>
            </tr>
          </thead>
          <tbody>
            {top25.map((r, i) => row(r, i))}
            {showAll && rest.map((r, i) => row(r, i + 25))}
          </tbody>
        </table>
      </Panel>
      <button
        onClick={() => setShowAll((v) => !v)}
        className="cbb-btn"
        style={{ marginTop: 14, background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}
      >
        {showAll ? "Show Top 25 only" : `Show all ${ranked.length} teams`}
      </button>
    </div>
  );
}

/* ---------- Postseason ---------- */
function roundLabel(numMatchups) {
  if (numMatchups === 1) return "FINAL";
  if (numMatchups === 2) return "SEMIFINALS";
  if (numMatchups === 4) return "QUARTERFINALS";
  return `ROUND OF ${numMatchups * 2}`;
}

function MatchupBox({ m, seedOf, userTeamId, onViewTeam }) {
  // Flag the transition from undecided -> decided so a freshly-simmed result
  // pulses gold and pops its score, while long-settled games stay quiet.
  const prevWinner = useRef(m.winner);
  const [justDecided, setJustDecided] = useState(false);
  useEffect(() => {
    if (!prevWinner.current && m.winner) {
      setJustDecided(true);
      const t = setTimeout(() => setJustDecided(false), 1200);
      prevWinner.current = m.winner;
      return () => clearTimeout(t);
    }
    prevWinner.current = m.winner;
  }, [m.winner]);

  const line = (id, score, top) => {
    if (!id) {
      return <div style={{ padding: "5px 8px", color: C.dimmer, fontSize: 12, borderBottom: top ? `1px solid ${C.line}` : "none" }}>—</div>;
    }
    const t = TEAM_MAP[id];
    const isWinner = m.winner === id;
    const decided = !!m.winner;
    const isUser = id === userTeamId;
    const seed = seedOf ? seedOf(id) : null;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onViewTeam && onViewTeam(id); }}
        className={justDecided && isWinner ? "cbb-win-pulse" : undefined}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
          padding: "5px 8px", cursor: onViewTeam ? "pointer" : "default",
          background: isUser && !(justDecided && isWinner) ? C.panelAlt : "transparent",
          borderBottom: top ? `1px solid ${C.line}` : "none",
          color: decided && !isWinner ? C.dimmer : C.cream,
          fontWeight: isWinner ? 700 : 400,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
          {seed ? <span className="cbb-num" style={{ color: C.dim, marginRight: 5, fontSize: 10.5 }}>{seed}</span> : null}
          {t.name}
        </span>
        <span className={`cbb-num${justDecided && isWinner ? " cbb-score-pop" : ""}`} style={{ fontSize: 12, color: isWinner ? C.wood : C.dimmer }}>{score ?? ""}</span>
      </div>
    );
  };
  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel, minWidth: 158 }}>
      {line(m.a, m.scoreA, true)}
      {line(m.b, m.scoreB, false)}
    </div>
  );
}

const LEADER_CATS = [
  { key: "ppg", label: "Points", unit: "PPG" },
  { key: "rpg", label: "Rebounds", unit: "RPG" },
  { key: "apg", label: "Assists", unit: "APG" },
];

function LeaderboardTab({ leaders, userTeamId, year, onViewTeam }) {
  const [cat, setCat] = useState("ppg");
  const active = LEADER_CATS.find((c) => c.key === cat) || LEADER_CATS[0];

  const ranked = useMemo(() => {
    return [...leaders].sort((a, b) => b[cat] - a[cat]).slice(0, 100);
  }, [leaders, cat]);

  const userBest = useMemo(() => {
    const mine = leaders.filter((p) => p.isUser).sort((a, b) => b[cat] - a[cat]);
    if (!mine.length) return null;
    const full = [...leaders].sort((a, b) => b[cat] - a[cat]);
    const top = mine[0];
    return { player: top, rank: full.findIndex((p) => p.id === top.id) + 1 };
  }, [leaders, cat]);

  return (
    <div>
      <SectionIntro>
        National per-game leaders across every Division I program for the {seasonLabel(year)} season. Rival programs post their real production; your own players carry the stats they&apos;ve actually put up in your dynasty so far — so your guys rise up the board as you play.
      </SectionIntro>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {LEADER_CATS.map((c) => {
          const on = c.key === cat;
          return (
            <button key={c.key} onClick={() => setCat(c.key)} className="cbb-btn"
              style={{
                fontSize: 12.5, padding: "8px 14px", border: `1px solid ${on ? C.wood : C.line}`,
                background: on ? C.wood : "transparent", color: on ? "#1a0f06" : C.dim,
                fontWeight: on ? 700 : 500, letterSpacing: "0.03em", cursor: "pointer",
              }}>
              {c.label} <span className="cbb-num" style={{ opacity: 0.7 }}>({c.unit})</span>
            </button>
          );
        })}
      </div>

      {userBest && (
        <Panel style={{ padding: "12px 16px", marginBottom: 14, borderColor: C.gold, background: C.panelAlt, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Medal size={18} color={C.gold} />
          <div style={{ fontSize: 12.5, color: C.cream }}>
            Your team leader in {active.label.toLowerCase()}: <strong style={{ color: C.gold }}>{userBest.player.name}</strong>
            {" "}at <span className="cbb-num" style={{ color: C.gold }}>{userBest.player[cat].toFixed(1)}</span> {active.unit}
            <span style={{ color: C.dim }}> — No. {userBest.rank} in the country</span>
          </div>
        </Panel>
      )}

      <Panel style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 44px 66px 66px 66px", padding: "8px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 10.5, color: C.dim, letterSpacing: "0.06em" }}>
          <span>RK</span><span>PLAYER</span><span>TEAM</span><span>POS</span>
          {LEADER_CATS.map((c) => (
            <span key={c.key} style={{ textAlign: "right", color: c.key === cat ? C.wood : C.dim, fontWeight: c.key === cat ? 700 : 400 }}>{c.unit}</span>
          ))}
        </div>
        {ranked.map((p, i) => (
          <div key={p.id}
            onClick={() => onViewTeam && onViewTeam(p.teamId)}
            className="cbb-row"
            style={{
              display: "grid", gridTemplateColumns: "48px 1fr 130px 44px 66px 66px 66px",
              padding: "8px 14px", borderBottom: `1px solid ${C.line}`, alignItems: "center",
              cursor: onViewTeam ? "pointer" : "default",
              background: p.isUser ? "rgba(216,168,58,0.10)" : "transparent",
            }}>
            <span className="cbb-num" style={{ fontSize: 13, color: i < 3 ? C.gold : C.dimmer, fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: p.isUser ? C.gold : C.cream, fontWeight: p.isUser ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}{p.isUser && <span style={{ fontSize: 9, color: C.gold, marginLeft: 6, border: `1px solid ${C.wood}`, padding: "1px 4px", letterSpacing: "0.06em" }}>YOU</span>}
            </span>
            <span style={{ fontSize: 11.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.teamName}</span>
            <span style={{ fontSize: 11, color: C.dimmer }}>{p.pos}</span>
            {LEADER_CATS.map((c) => (
              <span key={c.key} className="cbb-num" style={{ textAlign: "right", fontSize: 13, color: c.key === cat ? (p.isUser ? C.gold : C.cream) : C.dimmer, fontWeight: c.key === cat ? 700 : 400 }}>
                {p[c.key].toFixed(1)}
              </span>
            ))}
          </div>
        ))}
        {ranked.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.dimmer, fontSize: 12.5 }}>No player data available for this season.</div>
        )}
      </Panel>
    </div>
  );
}

function BracketView({ bracket, userTeamId, onViewTeam }) {
  if (!bracket || bracket.rounds.length === 0) {
    const champ = bracket?.champion;
    return (
      <div style={{ fontSize: 12, color: C.dim, padding: 8 }}>
        {champ ? <>Auto-berth: <strong style={{ color: C.cream }}>{TEAM_MAP[champ].name}</strong></> : "No bracket"}
      </div>
    );
  }
  const seedOf = (id) => {
    const i = bracket.seeds.indexOf(id);
    return i >= 0 ? i + 1 : null;
  };
  // The furthest-right round is the one that just appeared after a sim, so it
  // slides in fresh; earlier rounds stay put (they already mounted).
  const lastRoundIndex = bracket.rounds.length - 1;
  return (
    <div className="cbb-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
      {bracket.rounds.map((round, ri) => (
        <div
          key={ri}
          className={ri === lastRoundIndex ? "cbb-slide-in" : undefined}
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 8, minWidth: 158 }}
        >
          <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: "0.1em" }}>{roundLabel(round.length)}</div>
          {round.map((m, mi) => (
            <MatchupBox key={mi} m={m} seedOf={seedOf} userTeamId={userTeamId} onViewTeam={onViewTeam} />
          ))}
        </div>
      ))}
      {bracket.done && bracket.champion && (
        <div className="cbb-slide-in" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 150 }}>
          <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.1em", marginBottom: 6 }}>CHAMPION</div>
          <div style={{ border: `1px solid ${C.gold}`, background: C.panelAlt, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="cbb-crown-pop" style={{ display: "inline-flex" }}><Crown size={15} color={C.gold} /></span>
            <span style={{ fontWeight: 700, fontSize: 13, color: bracket.champion === userTeamId ? C.gold : C.cream }}>{TEAM_MAP[bracket.champion].name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PostseasonTab({ postseason, userTeamId, seasonOver, rankById, onStart, onSimRound, onPlayGame, userPending, onViewTeam }) {
  const userConf = TEAM_MAP[userTeamId].conf;

  if (!postseason) {
    return (
      <div>
        <SectionIntro>The road to the national title. Win your conference tournament for an automatic bid, or earn an at-large berth from the rankings, then survive six rounds of March Madness.</SectionIntro>
        <Panel style={{ padding: 28, textAlign: "center", maxWidth: 460 }}>
          {seasonOver ? (
            <>
              <Crown size={26} color={C.wood} />
              <h3 className="cbb-num" style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 6px" }}>Regular season complete</h3>
              <div style={{ color: C.dim, fontSize: 13, marginBottom: 18 }}>Tip off the conference tournaments — brackets are seeded off the current rankings.</div>
              <button onClick={onStart} className="cbb-btn" style={btnStyle(C.wood)}><Play size={13} /> Start Postseason</button>
            </>
          ) : (
            <>
              <div style={{ color: C.dim, fontSize: 13 }}>Finish the regular season on the Dashboard to unlock the postseason.</div>
            </>
          )}
        </Panel>
      </div>
    );
  }

  const ps = postseason;
  const phaseLabel = ps.phase === "conf" ? "Conference Tournaments" : ps.phase === "madness" ? "March Madness" : "Complete";
  const canSim = ps.phase !== "done";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.wood, letterSpacing: "0.08em", fontWeight: 600 }}>POSTSEASON</div>
          <h2 className="cbb-num" style={{ fontSize: 24, fontWeight: 700, margin: "2px 0" }}>{phaseLabel}</h2>
        </div>
        {canSim && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {userPending && (
              <button onClick={onPlayGame} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}>
                <Play size={13} /> Play My Game
              </button>
            )}
            <button onClick={onSimRound} className="cbb-btn" style={userPending ? btnStyle(C.panelAlt, C.cream) : btnStyle(C.wood)}>
              <FastForward size={13} /> {userPending ? "Sim My Game + Round" : "Sim Next Round"}
            </button>
          </div>
        )}
      </div>

      {ps.champion && (
        <Panel style={{ padding: 20, marginBottom: 18, borderColor: C.gold, background: C.panelAlt, display: "flex", alignItems: "center", gap: 14 }}>
          <Crown size={30} color={C.gold} />
          <div>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: "0.1em" }}>NATIONAL CHAMPION</div>
            <div className="cbb-num" style={{ fontSize: 26, fontWeight: 700, color: ps.champion === userTeamId ? C.gold : C.cream }}>
              {TEAM_MAP[ps.champion].name}{ps.champion === userTeamId ? " — that's you!" : ""}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Head to the Dashboard to advance to next season.</div>
          </div>
        </Panel>
      )}

      {ps.phase === "conf" && (
        <div>
          <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>YOUR CONFERENCE — {userConf.toUpperCase()}</div>
          <Panel style={{ padding: 14, marginBottom: 20 }}>
            <BracketView bracket={ps.confBrackets[userConf]} userTeamId={userTeamId} onViewTeam={onViewTeam} />
          </Panel>
          <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>
            CONFERENCE CHAMPIONS ({Object.keys(ps.confChampions).length}/{CONF_LIST.length})
          </div>
          <Panel style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {CONF_LIST.map((conf) => {
                const champ = ps.confChampions[conf];
                return (
                  <div key={conf} style={{ padding: "8px 12px", borderBottom: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conf}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: champ ? (champ === userTeamId ? C.gold : C.cream) : C.dimmer }}>
                      {champ ? TEAM_MAP[champ].name : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {ps.phase !== "conf" && ps.madness && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 18 }}>
            {ps.madness.regions.map((r) => (
              <div key={r.name}>
                <div style={{ fontSize: 12, color: C.wood, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>{r.name.toUpperCase()} REGION</div>
                <Panel style={{ padding: 12 }}>
                  <BracketView bracket={r.bracket} userTeamId={userTeamId} onViewTeam={onViewTeam} />
                </Panel>
              </div>
            ))}
          </div>
          {ps.madness.finalFour && (
            <div>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>FINAL FOUR</div>
              <Panel style={{ padding: 14 }}>
                <BracketView bracket={ps.madness.finalFour} userTeamId={userTeamId} onViewTeam={onViewTeam} />
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionIntro({ children }) {
  return <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 14, maxWidth: 720 }}>{children}</div>;
}

/* =========================================================================
   ROOT
   ========================================================================= */
export default function CBBDynasty() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState({}); // { 1: state|null, 2: ..., 3: ... }
  const [session, setSession] = useState(null); // active dynasty state
  const [pickingTeamFor, setPickingTeamFor] = useState(null); // slot number when choosing a team

  useEffect(() => {
    (async () => {
      setSlots(await loadAllSlots());
      setLoading(false);
    })();
  }, []);

  function startDynasty(team, slot, year = FIRST_YEAR) {
    // Reset the league to its history-seeded baseline (a prior dynasty this
    // session may have drifted the live values) before building the roster.
    const prestigeById = baselinePrestigeById();
    applyLivePrestige(prestigeById);
    const roster = buildInitialRoster(team, year);
    const state = {
      slot,
      teamId: team.id,
      year,
      seasonSeed: (Math.random() * 0xffffffff) >>> 0,
      prestigeById,
      roster,
      depthChart: defaultDepthChart(roster),
      schedule: genSchedule(team, year),
      recruitingBoard: seedInterest(genRecruitPool(year + 1), team), // board is always for the NEXT season's incoming class
      incomingCommits: [],
      recruitTargets: [],
      recruitingPoints: weeklyRecruitingBudget(team),
      recruitingWeekIndex: 1,
      strengths: genSeasonStrengths(),
      history: [],
      postseason: null,
      offseason: null,
      coach: { ...EMPTY_COACH },
      awardsHistory: [],
      draftHistory: [],
      expectation: seasonExpectation(team.prestige),
      rivalryLedger: {},
      prestigeTrendById: {},
    };
    setPickingTeamFor(null);
    setSession(state);
  }

  async function exitToSelect() {
    if (session && session.slot) await deleteSlot(session.slot);
    setSession(null);
    setPickingTeamFor(null);
    setSlots(await loadAllSlots());
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: C.bg, color: C.dim, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>Loading save…</div>;
  }

  if (session) {
    return <DynastyApp initial={session} onExit={exitToSelect} />;
  }

  if (pickingTeamFor) {
    return <TeamSelect onPick={(team, year) => startDynasty(team, pickingTeamFor, year)} />;
  }

  const anySave = SAVE_SLOTS.some((s) => slots[s]);
  if (!anySave) {
    // First-ever run: go straight to team select in slot 1.
    return <TeamSelect onPick={(team, year) => startDynasty(team, 1, year)} />;
  }

  return (
    <div className="cbb-root" style={{ minHeight: "100vh", background: C.bg, color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <Panel style={{ padding: 30, maxWidth: 560, width: "100%" }}>
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 4 }}>CBB DYNASTY</div>
        <h2 className="cbb-num" style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>Choose a save slot</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SAVE_SLOTS.map((slot) => {
            const s = slots[slot];
            return (
              <div key={slot} style={{ border: `1px solid ${C.line}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>SLOT {slot}</div>
                  {s ? (
                    <>
                      <div className="cbb-num" style={{ fontSize: 17, fontWeight: 700 }}>{TEAM_MAP[s.teamId]?.name || "—"}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>
                        {seasonLabel(s.year)}{s.coach ? ` · ${s.coach.wins}-${s.coach.losses} career · ${reputationTier(reputationOf(s.coach))}` : ""}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: C.dimmer, marginTop: 4 }}>Empty</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {s ? (
                    <>
                      <button onClick={() => setSession(s)} className="cbb-btn" style={btnStyle(C.wood)}>Continue</button>
                      <button
                        onClick={async () => { await deleteSlot(slot); setSlots(await loadAllSlots()); }}
                        className="cbb-btn"
                        style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "9px 12px", fontSize: 12.5, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setPickingTeamFor(slot)} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}>New Dynasty</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
