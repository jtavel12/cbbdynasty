import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import torvikSeasonsRaw from "./data/torvik-seasons.json";
import torvikPlayersRaw from "./data/torvik-players.json";
import {
  LayoutDashboard, Users, ListOrdered, Search, CalendarDays, Trophy,
  Save, RotateCcw, ChevronUp, ChevronDown, Play, FastForward, Star,
  ShieldCheck, X, Check, TrendingUp, Award, Crown,
  Medal, HeartPulse, Swords, Flame, GraduationCap, Landmark, Lock
} from "lucide-react";

/* =========================================================================
   COLOR / TYPE TOKENS  (arena-at-night / broadcast scoreboard aesthetic)
   ========================================================================= */
const C = {
  bg: "#10141a",
  bgRail: "#0c0f14",
  panel: "#1a2029",
  panelAlt: "#212938",
  line: "#2a3241",
  cream: "#eee8db",
  dim: "#8a94a6",
  dimmer: "#5c6577",
  wood: "#c1652f",
  woodDim: "#8a4a24",
  gold: "#d8a83a",
  green: "#4f9d69",
  red: "#c0463c",
  blue: "#4a7fc1",
};

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const POS_WEIGHTS = {
  PG: { scoring: 0.30, rebounding: 0.05, playmaking: 0.42, defense: 0.23 },
  SG: { scoring: 0.42, rebounding: 0.10, playmaking: 0.20, defense: 0.28 },
  SF: { scoring: 0.35, rebounding: 0.20, playmaking: 0.18, defense: 0.27 },
  PF: { scoring: 0.28, rebounding: 0.37, playmaking: 0.08, defense: 0.27 },
  C:  { scoring: 0.24, rebounding: 0.42, playmaking: 0.05, defense: 0.29 },
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
  return matched.filter((r) => r.player);
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
  return c && c.length ? c[0].year : (fallback ?? null);
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

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }

/* =========================================================================
   PLAYER / ATTRIBUTE GENERATION
   ========================================================================= */
function computeOverall(pos, attrs) {
  const w = POS_WEIGHTS[pos];
  return Math.round(attrs.scoring * w.scoring + attrs.rebounding * w.rebounding +
    attrs.playmaking * w.playmaking + attrs.defense * w.defense);
}

function ratingToStars(rating) {
  if (rating >= 0.985) return 5;
  if (rating >= 0.890) return 4;
  if (rating >= 0.790) return 3;
  return 2;
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

function genAttrsFromTier(tier) {
  // tier ~ 0..1, higher = more talented incoming baseline.
  // tier 0 (weakest programs) -> base 38, tier 1 (blue bloods) -> base 99,
  // so top-tier talent can genuinely reach a 99 overall.
  const base = 38 + tier * 61;
  const spread = 10;
  return {
    scoring: clamp(Math.round(rand(base - spread, base + spread)), 25, 99),
    rebounding: clamp(Math.round(rand(base - spread, base + spread)), 25, 99),
    playmaking: clamp(Math.round(rand(base - spread, base + spread)), 25, 99),
    defense: clamp(Math.round(rand(base - spread, base + spread)), 25, 99),
    potential: clamp(Math.round(rand(base - 5, base + 25)), 30, 99),
  };
}

// Derive attributes from a real player's actual per-game production instead
// of a random tier roll — this is what makes a real 20+ ppg scorer actually
// rate as a good player instead of a random dice roll. `tier` should be the
// strength of competition they actually earned these stats against (the
// team they played for), NOT necessarily the team signing them.
function genAttrsFromRealStats(real, tier) {
  const mult = competitionMultiplier(tier);
  // Convert season totals -> per game, then scale by competition and damp
  // tiny samples so a 3-game fluke can't out-rate a full-season contributor.
  const rel = sampleReliability(real.gp);
  const ppg = perGame(real.ppg, real.gp) * mult * rel;
  const rpg = perGame(real.rpg, real.gp) * mult * rel;
  const apg = perGame(real.apg, real.gp) * mult * rel;
  const scoring = clamp(Math.round(32 + ppg * 2.6), 25, 99);
  const rebounding = clamp(Math.round(30 + rpg * 5.0), 25, 99);
  const playmaking = clamp(Math.round(30 + apg * 6.5), 25, 99);
  // No reliable real defensive stat wired in yet — blend toward team tier
  // rather than pure random, so it isn't wildly inconsistent with the rest.
  const tierBase = 38 + tier * 40;
  const defense = clamp(Math.round(rand(tierBase - 8, tierBase + 8)), 25, 99);
  const peak = Math.max(scoring, rebounding, playmaking);
  const potential = clamp(Math.round(rand(peak - 3, Math.min(99, peak + 12))), 30, 99);
  return { scoring, rebounding, playmaking, defense, potential };
}

// A real player who logged no games / no production barely played. Rate them
// as a deep-bench walk-on regardless of program prestige — this is the fix
// for no-stat guys (e.g. Steve Johnson at Duke) reading as 90+ overall
// because they used to fall through to the blue-blood tier roll.
function genAttrsBenchReal(tier) {
  const base = 42 + tier * 8; // 42..50 — a touch better at stronger programs
  const spread = 6;
  const a = () => clamp(Math.round(rand(base - spread, base + spread)), 25, 99);
  return {
    scoring: a(), rebounding: a(), playmaking: a(), defense: a(),
    potential: clamp(Math.round(rand(base, base + 22)), 30, 99),
  };
}

// Maps CBBD's free-text position strings onto our five roster slots.
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

function makePlayer({ pos, classYear, prestige, starsAtSigning, real }) {
  const tier = clamp((prestige - 1) / 4 + rand(-0.12, 0.12), 0, 1);
  const gp = Number(real?.gp) || 0;
  const hasStats = !!real && gp > 0 && (real.ppg != null || real.rpg != null || real.apg != null);
  // Real player, but no usable box score => barely played => deep bench.
  const isRealBench = !!real && !hasStats;
  const attrs = hasStats
    ? genAttrsFromRealStats(real, tier)
    : isRealBench
      ? genAttrsBenchReal(tier)
      : genAttrsFromTier(tier);
  const overall = computeOverall(pos, attrs);
  return {
    id: uid(),
    name: real?.player || fullName(),
    realName: !!real,
    realKey: real?.player || null,
    originalTier: tier,
    realStats: hasStats,
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

const ROSTER_MIN = 10;
const ROSTER_MAX = 13;

// Base 2-per-position (10 total, satisfying ROSTER_MIN by construction),
// then randomly distribute up to 3 extra bench spots to reach ROSTER_MAX.
function rosterSlotPlan() {
  const base = { PG: 2, SG: 2, SF: 2, PF: 2, C: 2 };
  const extras = randInt(0, ROSTER_MAX - ROSTER_MIN);
  for (let i = 0; i < extras; i++) {
    const pos = pick(POSITIONS);
    if (base[pos] < 4) base[pos] += 1;
  }
  return POSITIONS.map((p) => [p, base[p]]);
}

function buildInitialRoster(team, year) {
  const slots = rosterSlotPlan();
  const classesForSlot = ["SR", "JR", "SO", "FR"];
  const realPlayers = shuffled(realPlayersFor(team, year));
  const byPos = { PG: [], SG: [], SF: [], PF: [], C: [], UNK: [] };
  realPlayers.forEach((r) => {
    const p = mapRealPosition(r.position) || "UNK";
    byPos[p].push(r);
  });

  // Use the player's TRUE career start (earliest season anywhere in the data),
  // not the data's per-team startSeason — otherwise every transfer reads FR.
  function realClassFor(real) {
    return realClassForName(real?.player, year, real?.startSeason);
  }

  // Pass 1: fill each slot preferentially with a real player at that exact
  // position. Slots that can't be filled this way stay null for now
  // rather than immediately going generated — a team can easily have more
  // real players at one position than we have slots for, and those extras
  // shouldn't be thrown away while another position goes fully synthetic.
  const roster = [];
  const openSlots = [];
  slots.forEach(([pos, count]) => {
    for (let i = 0; i < count; i++) {
      const real = byPos[pos].shift();
      if (real) {
        roster.push(makePlayer({ pos, classYear: realClassFor(real) || classesForSlot[i % classesForSlot.length], prestige: team.prestige, real }));
      } else {
        openSlots.push({ pos, i });
      }
    }
  });

  // Pass 2: backfill remaining open slots with ANY leftover real player
  // (surplus at an over-represented position, or unmapped/UNK position) —
  // labeled as playing the slot's position in-game, since a coarse
  // position tag matters far less than actually being a real person.
  const leftoverReal = [...POSITIONS.flatMap((p) => byPos[p]), ...byPos.UNK];
  openSlots.forEach(({ pos, i }) => {
    const real = leftoverReal.shift();
    const classYear = realClassFor(real) || classesForSlot[i % classesForSlot.length];
    roster.push(makePlayer({ pos, classYear, prestige: team.prestige, real }));
  });

  return roster;
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
function parseStateFromHometown(hometown) {
  if (!hometown) return null;
  const m = String(hometown).match(/,\s*([A-Za-z]{2})\b/);
  return m ? m[1].toUpperCase() : null;
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

function realRecruitsFor(year) {
  const rows = torvikPlayers[String(year)];
  if (!rows || !rows.length) return [];
  const newcomers = rows.filter((r) => r.player && r.startSeason === year && findOurTeamByRealName(r.team));
  return newcomers
    .map((r) => {
      const originalPrestige = findOurTeamByRealName(r.team)?.prestige ?? 2;
      const tier = clamp((originalPrestige - 1) / 4, 0, 1);
      // A newcomer who already played in a prior season is a transfer, not a
      // true freshman — label their class from their real career start.
      const transfer = isTransferName(r.player, year);
      const classYear = transfer ? (realClassForName(r.player, year, r.startSeason) || "SO") : "FR";
      // Star rating reflects the player's FRESHMAN season, so the board grades
      // them the same way scouts would coming out of high school — regardless
      // of how their career later develops once signed. For a true freshman
      // that's this row; for a transfer we reach back to their debut season.
      const firstRow = transfer ? (realStatRowForName(r.player, careerStartYear(r.player, r.startSeason)) || r) : r;
      const frGp = Number(firstRow.gp) || 0;
      const frPpg = perGame(firstRow.ppg, firstRow.gp);
      const frRpg = perGame(firstRow.rpg, firstRow.gp);
      // Value used for star rating / sort order is freshman-year per-game
      // production ADJUSTED for strength of competition — "20 ppg at a small
      // program shouldn't outrank 10 ppg at a high-major." Raw stats are kept
      // (and shown) separately so the board stays honest.
      const adjustedPpg = frPpg * competitionMultiplier(tier) * sampleReliability(frGp);
      const stars = adjustedPpg >= 16 ? 5 : adjustedPpg >= 11 ? 4 : adjustedPpg >= 6 ? 3 : null;
      const rating = stars ? clamp(0.70 + (adjustedPpg / 30) * 0.30, 0.70, 1.0) : null;
      return {
        id: uid(),
        name: r.player,
        pos: mapRealPosition(r.position) || pick(POSITIONS),
        state: parseStateFromHometown(r.hometown) || "—",
        classYear,
        isTransfer: transfer,
        stars,
        rating: rating ? Math.round(rating * 10000) / 10000 : null,
        real: true,
        // Freshman-season line drives the signed player's STARTING attributes;
        // year-over-year progression then tracks their real career from there.
        realStats: { ppg: firstRow.ppg, rpg: firstRow.rpg, apg: firstRow.apg, gp: firstRow.gp },
        originalTeam: r.team,
        originalPrestige,
        adjustedValue: adjustedPpg,
        hsStatline: { ppg: frPpg.toFixed(1), rpg: frRpg.toFixed(1) },
        committedTo: null,
        interest: 0,
        rivalPressure: randInt(15, 45),
        offerExtended: false,
        callsUsed: 0,
        visitsUsed: 0,
        homeVisitsUsed: 0,
      };
    })
    .sort((a, b) => b.adjustedValue - a.adjustedValue);
}

function genRecruitPool(year) {
  const real = realRecruitsFor(year);
  if (real.length > 0) return real;

  const pool = [];
  const n = 90;
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    let stars, rating;
    if (roll > 0.985) { stars = 5; rating = rand(0.985, 1.0); }
    else if (roll > 0.90) { stars = 4; rating = rand(0.890, 0.9849); }
    else if (roll > 0.55) { stars = 3; rating = rand(0.790, 0.8899); }
    else { stars = null; rating = null; } // unranked — resolved at signing

    const pos = pick(POSITIONS);
    const productionScore = randInt(35, 99); // HS per-game production proxy (0-99)
    pool.push({
      id: uid(),
      name: fullName(),
      pos,
      state: pick(STATES),
      classYear: "FR",
      stars,
      rating: rating ? Math.round(rating * 10000) / 10000 : null,
      productionScore,
      hsStatline: {
        ppg: (productionScore / 99 * 22 + rand(2, 6)).toFixed(1),
        rpg: (pos === "C" || pos === "PF" ? productionScore / 99 * 10 + rand(1, 3) : productionScore / 99 * 5 + rand(1, 2)).toFixed(1),
      },
      committedTo: null,
      // --- recruiting-trail state ---
      interest: 0,          // 0-100, how warm this recruit is on YOUR program
      rivalPressure: randInt(15, 45), // how hard other schools are working them
      offerExtended: false,
      callsUsed: 0,
      visitsUsed: 0,
      homeVisitsUsed: 0,
    });
  }
  return pool.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

/* --- Skill-based recruiting actions ------------------------------------ */
const RECRUIT_ACTIONS = {
  CALL: { key: "CALL", label: "Phone Call", cost: 5, gain: [3, 7], maxUses: 8 },
  VISIT: { key: "VISIT", label: "Campus Visit", cost: 18, gain: [9, 15], maxUses: 2 },
  OFFER: { key: "OFFER", label: "Scholarship Offer", cost: 14, gain: [6, 10], maxUses: 1, oneTime: true },
  HOME: { key: "HOME", label: "Home Visit", cost: 26, gain: [13, 20], maxUses: 1, minInterest: 25 },
};

function weeklyRecruitingBudget(team) {
  return 80 + team.prestige * 12; // stronger staffs cover more ground each week
}

function usesFieldFor(actionKey) {
  return actionKey === "CALL" ? "callsUsed" : actionKey === "VISIT" ? "visitsUsed" : actionKey === "HOME" ? "homeVisitsUsed" : null;
}

function canTakeAction(recruit, actionKey, pointsLeft) {
  const action = RECRUIT_ACTIONS[actionKey];
  if (pointsLeft < action.cost) return false;
  if (actionKey === "OFFER") return !recruit.offerExtended;
  if (actionKey === "HOME") return recruit.offerExtended && recruit.interest >= action.minInterest && recruit.homeVisitsUsed < action.maxUses;
  const field = usesFieldFor(actionKey);
  return recruit[field] < action.maxUses;
}

function applyRecruitAction(recruit, actionKey) {
  const action = RECRUIT_ACTIONS[actionKey];
  const gain = rand(action.gain[0], action.gain[1]);
  const next = { ...recruit, interest: clamp(recruit.interest + gain, 0, 100) };
  if (actionKey === "OFFER") next.offerExtended = true;
  const field = usesFieldFor(actionKey);
  if (field) next[field] = next[field] + 1;
  return next;
}

function signChance(recruit) {
  if (!recruit.offerExtended) return 0;
  const total = recruit.interest + recruit.rivalPressure;
  return total <= 0 ? 0.5 : clamp(recruit.interest / total, 0.03, 0.97);
}

function advanceRecruitingWeeks(board, weeksElapsed) {
  let b = board;
  for (let i = 0; i < weeksElapsed; i++) b = tickRecruitingWeek(b);
  return b;
}

// Called once per recruiting week: rival schools keep working the board too.
function tickRecruitingWeek(board) {
  return board.map((r) => {
    if (r.committedTo) return r;
    const rivalPressure = clamp(r.rivalPressure + rand(-2, 6), 5, 95);
    let committedTo = null;
    // recruits you haven't engaged can slip away to another program over time
    if (r.interest < rivalPressure * 0.6 && Math.random() < 0.05 + (rivalPressure - r.interest) / 400) {
      committedTo = "rival";
    }
    return { ...r, rivalPressure, committedTo };
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
    const attrs = genAttrsFromRealStats(recruit.realStats, originalTier);
    const overall = computeOverall(recruit.pos, attrs);
    return {
      id: uid(),
      name: recruit.name,
      realName: true,
      realKey: recruit.name,
      originalTier,
      realStats: true,
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
  const attrs = genAttrsFromTier(tier);
  const overall = computeOverall(recruit.pos, attrs);
  return {
    id: uid(),
    name: recruit.name,
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
   SCHEDULE + SIM
   ========================================================================= */
const NONCONF_GAMES = 11;
const CONF_GAMES = 19;

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

// A team's power MUST live on the same scale as `userTeamOverall` (the
// minutes-weighted player-OVR average, ~38-80) so the user's simulated games
// and the projected standings compare apples to apples. Player attributes are
// built from `38 + tier*40`, so we map prestige onto that exact range.
const LEAGUE_AVG_POWER = 50; // a league-average team; the .500 pivot

function teamPowerRating(team, strengthMap, year, { noise = true } = {}) {
  // Standings must be stable across re-renders, so callers that want a
  // deterministic value pass noise:false. Game sims keep the jitter.
  const jitter = noise ? rand(-4, 4) : 0;
  if (year != null) {
    const real = realSeasonFor(team, year);
    if (real && real.barthag != null && !Number.isNaN(real.barthag)) {
      // barthag is Torvik's win-probability-vs-an-average-team (0..1) — map
      // it onto the player-OVR scale (barthag .5 ~ a league-average roster).
      return clamp(35 + real.barthag * 55 + jitter, 25, 95);
    }
  }
  const drift = strengthMap[team.id] ?? 0;
  const talent = 38 + ((team.prestige - 1) / 4) * 40; // prestige 1->38 ... 5->78
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
  return clamp(0.5 + (power - oppPower) / 42, 0.02, 0.98);
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

function recordTableFor(powerById, userTeamId, userRecord) {
  const rec = {};
  for (const t of TEAMS) {
    rec[t.id] = t.id === userTeamId
      ? { wins: userRecord.w, losses: userRecord.l }
      : projectedRecord(t, powerById);
  }
  return rec;
}

function rankingScore(wins, losses, power) {
  const games = wins + losses;
  const shrunkWinPct = (wins + 3) / (games + 6); // Bayesian shrink toward .500
  const quality = clamp((power - 25) / (92 - 25), 0, 1);
  // Winning is weighted heavily so a dominant lower-prestige team can crack the
  // poll, but quality still keeps blue bloods near the top of a crowded field.
  return shrunkWinPct * 0.78 + quality * 0.22;
}

// Returns { ranked: [{team,wins,losses,power,score}], rankById } sorted best-first.
function computeRankings(powerById, recordById) {
  const ranked = TEAMS.map((t) => {
    const r = recordById[t.id];
    return { team: t, wins: r.wins, losses: r.losses, power: powerById[t.id], score: rankingScore(r.wins, r.losses, powerById[t.id]) };
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

  const { powerById, userTeamId, roster, depthChart, strengths, year } = ctx;
  if (userTeamId && (m.a === userTeamId || m.b === userTeamId)) {
    const oppId = m.a === userTeamId ? m.b : m.a;
    const oppPower = teamPowerRating(TEAM_MAP[oppId], strengths, year);
    const res = simulateGame(roster, healthyDepthChart(depthChart, roster), oppPower);
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
  const simmed = cur.map((m) => simMatchup(m, ctx));
  rounds[rounds.length - 1] = simmed;
  const winners = simmed.map((m) => m.winner).filter(Boolean);
  if (winners.length <= 1) {
    return { ...bracket, rounds, champion: winners[0] || null, done: true };
  }
  const next = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push({ a: winners[i], b: winners[i + 1] ?? null, winner: null, scoreA: null, scoreB: null, bye: false });
  }
  rounds.push(next);
  return { ...bracket, rounds, champion: null, done: false };
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
      sum += pl.overall * mins[i];
      totalW += mins[i];
    });
  });
  return totalW ? sum / totalW : 55;
}

function simulateGame(roster, depthChart, oppPower, momentum = 0) {
  const myPower = userTeamOverall(roster, depthChart) + momentum;
  const diff = myPower - oppPower;
  const margin = diff * 0.55 + rand(-11, 11);
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
      const ast = Math.max(0, Math.round((m / 30) * (pl.attrs.playmaking / 99) * 7 * rand(0.5, 1.5)));
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
          const attrs = genAttrsFromRealStats(row, tier);
          return {
            ...p, class: nextClass, attrs, overall: computeOverall(p.pos, attrs),
            career: rolledCareer, season: { gp: 0, pts: 0, reb: 0, ast: 0 },
          };
        }
      }

      // Generated players (and real players past their real career) develop
      // synthetically toward their potential.
      const growth = Math.round((p.attrs.potential - p.overall) * rand(0.05, 0.22));
      const bump = clamp(growth, -2, 9);
      const attrs = {
        scoring: clamp(p.attrs.scoring + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        rebounding: clamp(p.attrs.rebounding + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        playmaking: clamp(p.attrs.playmaking + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        defense: clamp(p.attrs.defense + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        potential: p.attrs.potential,
      };
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

  // enforce the scholarship ceiling: trim weakest non-freshmen first
  if (combined.length > ROSTER_MAX) {
    combined.sort((a, b) => (a.class === "FR" ? 1 : 0) - (b.class === "FR" ? 1 : 0) || a.overall - b.overall);
    combined.splice(0, combined.length - ROSTER_MAX);
  }

  // enforce the floor: a team that lost too many seniors and didn't
  // recruit enough shouldn't drop below a real minimum roster size —
  // fill remaining spots with walk-on-tier freshmen at whatever
  // position is currently thinnest.
  while (combined.length < ROSTER_MIN) {
    const counts = Object.fromEntries(POSITIONS.map((p) => [p, 0]));
    combined.forEach((p) => { counts[p.pos] = (counts[p.pos] || 0) + 1; });
    const thinnest = POSITIONS.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    combined.push(makePlayer({ pos: thinnest, classYear: "FR", prestige: team?.prestige ?? 2 }));
  }

  return combined;
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
function decideDepartures(roster) {
  const early = [];
  roster.forEach((p) => {
    if (p.class === "SR") return;
    const o = p.overall;
    let chance = o >= 90 ? 0.9 : o >= 85 ? 0.6 : o >= 80 ? 0.38 : o >= 76 ? 0.18 : o >= 72 ? 0.07 : 0;
    if (p.class === "JR") chance += 0.08;
    if (Math.random() < chance) early.push(p);
  });
  return early;
}

function draftBoard(early, seniors) {
  return [...early, ...seniors.filter((p) => p.overall >= 80)]
    .sort((a, b) => b.overall - a.overall)
    .map((p, i) => ({ name: p.name, pos: p.pos, overall: p.overall, class: p.class, pick: i + 1, early: p.class !== "SR" }));
}

/* =========================================================================
   COACH CAREER + REPUTATION
   ========================================================================= */
const EMPTY_COACH = { wins: 0, losses: 0, seasons: 0, tourneyApps: 0, confTourneyTitles: 0, finalFours: 0, natTitles: 0 };
const JOB_REP_REQ = { 5: 120, 4: 70, 3: 35, 2: 12, 1: 0 };

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
  { id: "postseason", label: "Postseason", icon: Crown },
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
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveDynasty(state); }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const team = TEAM_MAP[state.teamId];

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
    const recordById = recordTableFor(powerById, state.teamId, record);
    return computeRankings(powerById, recordById);
  }, [state.strengths, state.year, state.teamId, record]);

  const reputation = reputationOf(state.coach);
  const rivalIds = useMemo(() => rivalTeamIds(state.teamId), [state.teamId]);
  const needs = useMemo(() => positionNeeds(state.roster), [state.roster]);
  const bracketology = projectedSeed(rankById[state.teamId]);

  function simOneGame() {
    if (!nextGame) return;
    const opp = TEAM_MAP[nextGame.oppId];
    const oppPower = teamPowerRating(opp, state.strengths, state.year);
    const hdc = healthyDepthChart(state.depthChart, state.roster);
    const mom = momentumMod(currentStreak(state.schedule));
    const result = simulateGame(state.roster, hdc, oppPower, mom);
    const oppRank = rankById[nextGame.oppId] || null;

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
    const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(state.recruitingBoard, weeksElapsed) : state.recruitingBoard;
    const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : state.recruitingPoints;

    setState((s) => ({ ...s, roster, schedule, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex }));

    const sig = result.win && oppRank && oppRank <= 25;
    let msg = result.win
      ? `Beat ${opp.name} ${result.myScore}-${result.oppScore}${sig ? ` — signature win over No. ${oppRank}!` : ""}`
      : `Lost to ${opp.name} ${result.oppScore}-${result.myScore}`;
    if (inj.injured) msg += ` ${inj.injured.name} injured (out ${inj.injured.games}).`;
    flash(msg);
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
      const result = simulateGame(roster, hdc, oppPower, mom);
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
      const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(s.recruitingBoard, weeksElapsed) : s.recruitingBoard;
      const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : s.recruitingPoints;
      return { ...s, roster, schedule: games, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex };
    });
    flash(`Simulated the rest of the season.${sigWins ? ` ${sigWins} signature win${sigWins > 1 ? "s" : ""}.` : ""}`);
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
    };
    let userBox = null;
    const captureBox = (bracket) => {
      const last = bracket.rounds[bracket.rounds.length - 1];
      if (last) for (const m of last) if (m.userBox) userBox = m.userBox;
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

  function doRecruitAction(recruit, actionKey) {
    if (!canTakeAction(recruit, actionKey, state.recruitingPoints)) return;
    const action = RECRUIT_ACTIONS[actionKey];
    const updated = applyRecruitAction(recruit, actionKey);
    setState((s) => ({
      ...s,
      recruitingPoints: s.recruitingPoints - action.cost,
      recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? updated : r)),
    }));
  }

  function attemptSign(recruit) {
    if (state.incomingCommits.length >= 5) { flash("Class is full (5 max) for this cycle."); return; }
    if (!recruit.offerExtended) { flash("Extend a scholarship offer before you can sign them."); return; }
    const chance = signChance(recruit);
    const success = Math.random() < chance;
    if (success) {
      setState((s) => ({
        ...s,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? { ...r, committedTo: s.teamId } : r)),
        incomingCommits: [...s.incomingCommits, recruit.id],
      }));
      flash(`${recruit.name} has committed! (won at ${Math.round(chance * 100)}% odds)`);
    } else {
      setState((s) => ({
        ...s,
        recruitingBoard: s.recruitingBoard.map((r) => (r.id === recruit.id ? { ...r, rivalPressure: clamp(r.rivalPressure + 10, 0, 95) } : r)),
      }));
      flash(`${recruit.name} isn't ready to commit yet. (${Math.round(chance * 100)}% odds — keep working them)`);
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

  function advanceYear() {
    const powerById = powerTableFor(state.strengths, state.year);
    const awards = computeAwards(state, rankById, ranked, powerById);
    const early = decideDepartures(state.roster);
    const seniors = state.roster.filter((p) => p.class === "SR");
    const draft = draftBoard(early, seniors);
    const coach = finalizeCoachSeason(state.coach, record, state.postseason, state.teamId);
    const earlyIds = new Set(early.map((p) => p.id));

    const incomingRecruits = state.incomingCommits
      .map((id) => state.recruitingBoard.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => recruitToPlayer(r, team));

    const newYear = state.year + 1;
    const surviving = state.roster.filter((p) => !earlyIds.has(p.id));
    const newRoster = progressRosterForNewYear(surviving, incomingRecruits, team, newYear);
    const newStrengths = genSeasonStrengths();
    const psSummary = postseasonSummary(state.postseason, state.teamId);

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
      roster: newRoster,
      depthChart: defaultDepthChart(newRoster),
      schedule: genSchedule(team, newYear),
      recruitingBoard: genRecruitPool(newYear),
      incomingCommits: [],
      recruitingPoints: weeklyRecruitingBudget(team),
      recruitingWeekIndex: 1,
      strengths: newStrengths,
      postseason: null,
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
    });
    setRecap(recapData);
  }

  function changeJob(newTeam) {
    const coach = finalizeCoachSeason(state.coach, record, state.postseason, state.teamId);
    const powerById = powerTableFor(state.strengths, state.year);
    const awards = computeAwards(state, rankById, ranked, powerById);
    const newYear = state.year + 1;
    const roster = buildInitialRoster(newTeam, newYear);
    setState({
      ...state,
      teamId: newTeam.id,
      year: newYear,
      roster,
      depthChart: defaultDepthChart(roster),
      schedule: genSchedule(newTeam, newYear),
      recruitingBoard: genRecruitPool(newYear + 1),
      incomingCommits: [],
      recruitingPoints: weeklyRecruitingBudget(newTeam),
      recruitingWeekIndex: 1,
      strengths: genSeasonStrengths(),
      postseason: null,
      coach,
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
    setState((s) => ({
      ...s,
      schedule: s.schedule.map((g) =>
        g.id === gameId && !g.conf && !g.played ? { ...g, ...changes } : g
      ),
    }));
  }

  const seasonOver = state.schedule.every((g) => g.played);

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
          {TABS.map((t) => {
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
              onSim={simOneGame} onSimSeason={simToEndOfSeason} seasonOver={seasonOver} onAdvanceYear={advanceYear}
              onChangeJob={() => setJobPickerOpen(true)} reputation={reputation} bracketology={bracketology}
              onViewPlayer={setPlayerViewId} />
          )}
          {tab === "roster" && <RosterTab roster={state.roster} onViewPlayer={setPlayerViewId} />}
          {tab === "depth" && <DepthChartTab roster={state.roster} depthChart={state.depthChart} onMove={moveInDepthChart} />}
          {tab === "recruiting" && (
            <RecruitingTab
              board={state.recruitingBoard}
              committedIds={state.incomingCommits}
              points={state.recruitingPoints}
              budget={weeklyRecruitingBudget(team)}
              onAction={doRecruitAction}
              onSign={attemptSign}
              team={team}
              needs={needs}
            />
          )}
          {tab === "schedule" && <ScheduleTab schedule={state.schedule} teamConf={team.conf} rankById={rankById} rivalIds={rivalIds} onViewTeam={setViewTeamId} onEditGame={editGame} onViewBox={setBoxViewId} />}
          {tab === "standings" && <StandingsTab team={team} ranked={ranked} rankById={rankById} userRecord={record} onViewTeam={setViewTeamId} />}
          {tab === "rankings" && <RankingsTab ranked={ranked} userTeamId={state.teamId} onViewTeam={setViewTeamId} />}
          {tab === "program" && <ProgramTab state={state} team={team} record={record} reputation={reputation} rivalIds={rivalIds} rankById={rankById} />}
          {tab === "postseason" && (
            <PostseasonTab
              postseason={state.postseason}
              userTeamId={state.teamId}
              seasonOver={seasonOver}
              rankById={rankById}
              onStart={startPostseason}
              onSimRound={simPostseasonRound}
              onViewTeam={setViewTeamId}
            />
          )}
        </div>
      </div>

      {viewTeamId && (
        <TeamRosterModal teamId={viewTeamId} year={state.year} strengths={state.strengths} rank={rankById[viewTeamId]} onClose={() => setViewTeamId(null)} />
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
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab({ state, team, record, nextGame, onSim, onSimSeason, seasonOver, onAdvanceYear, onChangeJob, reputation, bracketology, onViewPlayer }) {
  const overall = Math.round(userTeamOverall(state.roster, state.depthChart));
  const topPlayer = [...state.roster].sort((a, b) => b.overall - a.overall)[0];
  const injured = state.roster.filter(isHurt);
  const streak = currentStreak(state.schedule);

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

      <Panel style={{ padding: 20 }}>
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>NEXT GAME</div>
        {nextGame ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="cbb-num" style={{ fontSize: 19, fontWeight: 600 }}>
                {nextGame.home ? "vs" : "at"} {TEAM_MAP[nextGame.oppId].name}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Week {nextGame.week} · {TEAM_MAP[nextGame.oppId].conf}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onSim} className="cbb-btn" style={btnStyle(C.wood)}><Play size={13} /> Sim Game</button>
              <button onClick={onSimSeason} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><FastForward size={13} /> Sim to End of Season</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ color: C.dim, fontSize: 14, flex: 1, minWidth: 220 }}>Season complete — {record.w}-{record.l}. Head to Recruiting to finish your class, then advance the year — or take a new job elsewhere.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onChangeJob} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}><Users size={13} /> Take Another Job</button>
              <button onClick={onAdvanceYear} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><TrendingUp size={13} /> Advance to {seasonLabel(state.year + 1)}</button>
            </div>
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
function DepthChartTab({ roster, depthChart, onMove }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      {POSITIONS.map((pos) => (
        <Panel key={pos} style={{ padding: 14 }}>
          <div className="cbb-num" style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: C.wood }}>{pos}</div>
          {depthChart[pos].map((id, i) => {
            const p = roster.find((pl) => pl.id === id);
            if (!p) return null;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < depthChart[pos].length - 1 ? `1px solid ${C.line}` : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: isHurt(p) ? C.dimmer : C.cream }}>
                    {i === 0 ? "★ " : ""}{p.name}
                    {isHurt(p) && <span style={{ fontSize: 9, color: C.red, marginLeft: 5 }}>OUT</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim }}>{p.class} · OVR {p.overall}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button onClick={() => onMove(pos, i, -1)} disabled={i === 0} className="cbb-btn" style={{ background: "none", border: "none", color: i === 0 ? C.dimmer : C.dim, cursor: i === 0 ? "default" : "pointer" }}><ChevronUp size={14} /></button>
                  <button onClick={() => onMove(pos, i, 1)} disabled={i === depthChart[pos].length - 1} className="cbb-btn" style={{ background: "none", border: "none", color: i === depthChart[pos].length - 1 ? C.dimmer : C.dim, cursor: "pointer" }}><ChevronDown size={14} /></button>
                </div>
              </div>
            );
          })}
        </Panel>
      ))}
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

function RecruitingTab({ board, committedIds, points, budget, onAction, onSign, team, needs = [] }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [openId, setOpenId] = useState(null);
  const needSet = new Set(needs);
  const list = board
    .filter((r) => posFilter === "ALL" || r.pos === posFilter)
    .filter((r) => !r.committedTo || committedIds.includes(r.id))
    .sort((a, b) => (b.interest - b.rivalPressure) - (a.interest - a.rivalPressure));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ fontSize: 13, color: C.dim }}>
            Class: <strong style={{ color: C.cream }}>{committedIds.length}/5</strong> committed
          </div>
          <div style={{ fontSize: 13, color: C.dim }}>
            Recruiting points this week: <strong style={{ color: C.gold }}>{points}</strong> / {budget}
          </div>
        </div>
        <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}
          style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.cream, padding: "6px 10px", fontSize: 13 }}>
          <option value="ALL">All positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {needs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", border: `1px solid ${C.wood}`, background: C.panel, fontSize: 12.5 }}>
          <span style={{ color: C.wood, letterSpacing: "0.06em", fontWeight: 600 }}>TEAM NEEDS</span>
          <span style={{ color: C.dim }}>Thin next season at</span>
          {needs.map((p) => (
            <span key={p} className="cbb-num" style={{ border: `1px solid ${C.wood}`, color: C.gold, padding: "1px 7px", fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((r) => {
          const mine = committedIds.includes(r.id);
          const open = openId === r.id;
          const chance = signChance(r);
          return (
            <Panel key={r.id} style={{ padding: 0 }}>
              <div
                className="cbb-row"
                onClick={() => setOpenId(open ? null : r.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: mine ? "default" : "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {r.name}
                      {needSet.has(r.pos) && (
                        <span style={{ fontSize: 9.5, color: C.gold, marginLeft: 6, letterSpacing: "0.06em", border: `1px solid ${C.wood}`, padding: "1px 4px", verticalAlign: "middle" }}>
                          FILLS NEED
                        </span>
                      )}
                      {r.isTransfer && (
                        <span style={{ fontSize: 9.5, color: C.wood, marginLeft: 6, letterSpacing: "0.06em", border: `1px solid ${C.line}`, padding: "1px 4px", verticalAlign: "middle" }}>
                          {r.classYear} TRANSFER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {r.pos} · {r.state} · {r.hsStatline.ppg} fr. ppg{r.originalTeam ? ` · ${r.originalTeam}` : ""}
                    </div>
                  </div>
                  <StarRow stars={r.stars} />
                  <span style={{ color: C.dimmer, fontSize: 11, width: 56 }}>{r.rating ? r.rating.toFixed(3) : "TBD"}</span>
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
                    const usable = canTakeAction(r, action.key, points);
                    return (
                      <button
                        key={action.key}
                        disabled={!usable}
                        onClick={() => onAction(r, action.key)}
                        className="cbb-btn"
                        style={{
                          fontSize: 12, padding: "7px 11px", border: `1px solid ${C.line}`,
                          background: action.key === "OFFER" && r.offerExtended ? C.panelAlt : "transparent",
                          color: usable ? C.cream : C.dimmer, cursor: usable ? "pointer" : "not-allowed",
                        }}
                      >
                        {action.label} · {action.cost}pt
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onSign(r)}
                    disabled={!r.offerExtended}
                    className="cbb-btn"
                    style={{ ...btnStyle(r.offerExtended ? C.wood : C.line), fontSize: 12, padding: "7px 12px", cursor: r.offerExtended ? "pointer" : "not-allowed" }}
                  >
                    Attempt to Sign ({Math.round(chance * 100)}%)
                  </button>
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      <div style={{ fontSize: 11.5, color: C.dimmer, marginTop: 14, maxWidth: 680 }}>
        {board[0]?.real
          ? `This class is sourced from real players whose real careers began this year — true freshmen and transfers, not generated prospects. Stats shown are their actual production, but star ratings are adjusted for the strength of the program they played for — a modest scorer at a high-major is rated above a big scorer at a weak program. `
          : `This class is generated (no real data available for this recruiting year). `}
        Build interest with Phone Calls and Campus Visits, extend a Scholarship Offer to make them sign-eligible,
        then a Home Visit for a late push. Rival programs are working every recruit too — wait too long and they
        can commit elsewhere. {!board[0]?.real && `Recruits marked "TBD" are unranked; their composite rating is set from ${team.name}'s prestige and their production once they sign.`}
      </div>
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

/* ---------- Opponent Roster Viewer ---------- */
function TeamRosterModal({ teamId, year, strengths, rank, onClose }) {
  const team = TEAM_MAP[teamId];
  const [view, setView] = useState("roster");
  const roster = useMemo(() => {
    const r = buildInitialRoster(team, year);
    return [...r].sort((a, b) => b.overall - a.overall);
  }, [teamId, year]);
  const schedule = useMemo(() => genSchedule(team, year), [teamId, year]);
  const teamPower = useMemo(() => teamPowerRating(team, strengths, year, { noise: false }), [teamId, year, strengths]);
  const realCount = roster.filter((p) => p.realName).length;

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
          <AttrBar label="Scoring" value={p.attrs.scoring} />
          <AttrBar label="Rebounding" value={p.attrs.rebounding} />
          <AttrBar label="Playmaking" value={p.attrs.playmaking} />
          <AttrBar label="Defense" value={p.attrs.defense} />
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
  const rivalNames = [...rivalIds].map((id) => TEAM_MAP[id]?.name).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 940 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatBlock label="Career Record" value={`${careerW}-${careerL}`} />
        <StatBlock label="Win %" value={winPct} />
        <StatBlock label="Seasons" value={coach.seasons} />
        <StatBlock label="Reputation" value={reputation} />
      </div>

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
        {rivalNames.length > 0 && (
          <div style={{ fontSize: 11.5, color: C.dimmer, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Swords size={12} color={C.red} /> Conference rivals: {rivalNames.join(", ")}
          </div>
        )}
      </Panel>

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

function ScheduleRow({ g, teamConf, rankById, isRival, onViewTeam, onEditGame, onViewBox }) {
  const [editing, setEditing] = useState(false);
  const opp = TEAM_MAP[g.oppId];
  const editable = !g.conf && !g.played && !!onEditGame;
  const signature = g.played && g.result.win && g.result.oppRank && g.result.oppRank <= 25;
  const hasBox = g.played && g.result.box && g.result.box.length > 0;
  // Non-conference opponents = every program outside your conference.
  const options = editable
    ? TEAMS.filter((t) => t.conf !== teamConf).sort((a, b) => a.name.localeCompare(b.name))
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
              isRival={rivalIds && rivalIds.has(g.oppId)}
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
  // Standings is the win/loss table: reuse the shared record data but sort by
  // record (not poll score). Top-25 teams still surface their national rank.
  const rows = ranked
    .map((r) => ({
      ...r.team,
      wins: r.team.id === team.id ? userRecord.w : r.wins,
      losses: r.team.id === team.id ? userRecord.l : r.losses,
      isUser: r.team.id === team.id,
    }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.prestige - a.prestige);

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
        Projected national standings — records are projected against each team&apos;s actual schedule strength (19 conference games + 11 non-conference), so a team that dominates a weaker league can rise to the top. Click any team to preview their roster.
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
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
          padding: "5px 8px", cursor: onViewTeam ? "pointer" : "default",
          background: isUser ? C.panelAlt : "transparent",
          borderBottom: top ? `1px solid ${C.line}` : "none",
          color: decided && !isWinner ? C.dimmer : C.cream,
          fontWeight: isWinner ? 700 : 400,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
          {seed ? <span className="cbb-num" style={{ color: C.dim, marginRight: 5, fontSize: 10.5 }}>{seed}</span> : null}
          {t.name}
        </span>
        <span className="cbb-num" style={{ fontSize: 12, color: isWinner ? C.wood : C.dimmer }}>{score ?? ""}</span>
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
  return (
    <div className="cbb-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
      {bracket.rounds.map((round, ri) => (
        <div key={ri} style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 8, minWidth: 158 }}>
          <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: "0.1em" }}>{roundLabel(round.length)}</div>
          {round.map((m, mi) => (
            <MatchupBox key={mi} m={m} seedOf={seedOf} userTeamId={userTeamId} onViewTeam={onViewTeam} />
          ))}
        </div>
      ))}
      {bracket.done && bracket.champion && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 150 }}>
          <div style={{ fontSize: 9.5, color: C.gold, letterSpacing: "0.1em", marginBottom: 6 }}>CHAMPION</div>
          <div style={{ border: `1px solid ${C.gold}`, background: C.panelAlt, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <Crown size={15} color={C.gold} />
            <span style={{ fontWeight: 700, fontSize: 13, color: bracket.champion === userTeamId ? C.gold : C.cream }}>{TEAM_MAP[bracket.champion].name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PostseasonTab({ postseason, userTeamId, seasonOver, rankById, onStart, onSimRound, onViewTeam }) {
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
          <button onClick={onSimRound} className="cbb-btn" style={btnStyle(C.wood)}>
            <FastForward size={13} /> Sim Next Round
          </button>
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
    const roster = buildInitialRoster(team, year);
    const state = {
      slot,
      teamId: team.id,
      year,
      roster,
      depthChart: defaultDepthChart(roster),
      schedule: genSchedule(team, year),
      recruitingBoard: genRecruitPool(year + 1), // board is always for the NEXT season's incoming class
      incomingCommits: [],
      recruitingPoints: weeklyRecruitingBudget(team),
      recruitingWeekIndex: 1,
      strengths: genSeasonStrengths(),
      history: [],
      postseason: null,
      coach: { ...EMPTY_COACH },
      awardsHistory: [],
      draftHistory: [],
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
