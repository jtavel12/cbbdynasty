import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import torvikSeasonsRaw from "./data/torvik-seasons.json";
import torvikPlayersRaw from "./data/torvik-players.json";
import {
  LayoutDashboard, Users, ListOrdered, Search, CalendarDays, Trophy,
  Save, RotateCcw, ChevronUp, ChevronDown, Play, FastForward, Star,
  ShieldCheck, X, Check, TrendingUp
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
  // tier ~ 0..1, higher = more talented incoming baseline
  const base = 38 + tier * 40;
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
  const ppg = (real.ppg ?? 0) * mult;
  const rpg = (real.rpg ?? 0) * mult;
  const apg = (real.apg ?? 0) * mult;
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
  const hasStats = real && (real.ppg != null || real.rpg != null || real.apg != null);
  const attrs = hasStats ? genAttrsFromRealStats(real, tier) : genAttrsFromTier(tier);
  const overall = computeOverall(pos, attrs);
  return {
    id: uid(),
    name: real?.player || fullName(),
    realName: !!real,
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

  function realClassFor(real) {
    return real?.startSeason != null
      ? ["FR", "SO", "JR", "SR"][clamp(year - real.startSeason, 0, 3)]
      : null;
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
      // Value used for star rating / sort order is production ADJUSTED for
      // strength of competition — this is the fix for "20 ppg at a small
      // program shouldn't outrank 10 ppg at a high-major." Raw stats are
      // still kept (and shown) separately so the board stays honest about
      // what actually happened on the court.
      const adjustedPpg = (r.ppg ?? 0) * competitionMultiplier(tier);
      const stars = adjustedPpg >= 16 ? 5 : adjustedPpg >= 11 ? 4 : adjustedPpg >= 6 ? 3 : null;
      const rating = stars ? clamp(0.70 + (adjustedPpg / 30) * 0.30, 0.70, 1.0) : null;
      return {
        id: uid(),
        name: r.player,
        pos: mapRealPosition(r.position) || pick(POSITIONS),
        state: parseStateFromHometown(r.hometown) || "—",
        classYear: "FR",
        stars,
        rating: rating ? Math.round(rating * 10000) / 10000 : null,
        real: true,
        realStats: { ppg: r.ppg, rpg: r.rpg, apg: r.apg },
        originalTeam: r.team,
        originalPrestige,
        adjustedValue: adjustedPpg,
        hsStatline: { ppg: (r.ppg ?? 0).toFixed(1), rpg: (r.rpg ?? 0).toFixed(1) },
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
      realStats: true,
      pos: recruit.pos,
      class: "FR",
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
function genSchedule(team, year) {
  const conf = TEAMS.filter((t) => t.conf === team.conf && t.id !== team.id);
  const nonConf = TEAMS.filter((t) => t.conf !== team.conf && t.id !== team.id);
  const games = [];
  let week = 1;
  // non-conference (8 games)
  for (let i = 0; i < 8; i++) {
    games.push({ id: uid(), week: week++, oppId: pick(nonConf).id, home: Math.random() > 0.4, played: false, result: null });
  }
  // conference (18 games, round-robin-ish w/ repeats if small conf)
  const confPool = conf.length ? conf : nonConf;
  for (let i = 0; i < 18; i++) {
    games.push({ id: uid(), week: week++, oppId: pick(confPool).id, home: i % 2 === 0, played: false, result: null });
  }
  return games;
}

function teamPowerRating(team, strengthMap, year) {
  if (year != null) {
    const real = realSeasonFor(team, year);
    if (real && real.barthag != null && !Number.isNaN(real.barthag)) {
      // barthag is Torvik's win-probability-vs-an-average-team (0..1) —
      // map it onto our 20-96 power scale, with a little game-to-game noise.
      return clamp(20 + real.barthag * 76 + rand(-3, 3), 20, 98);
    }
  }
  const drift = strengthMap[team.id] ?? 0;
  return clamp(team.prestige * 14 + drift + rand(-4, 4), 20, 96);
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

function simulateGame(roster, depthChart, oppPower) {
  const myPower = userTeamOverall(roster, depthChart);
  const diff = myPower - oppPower;
  const margin = diff * 0.55 + rand(-11, 11);
  const base = 66 + myPower / 6;
  const myScore = Math.round(base + margin / 2 + rand(-4, 4));
  const oppScore = Math.round(base - margin / 2 + rand(-4, 4));

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

  return {
    win: myScore >= oppScore,
    myScore: Math.max(myScore, 38),
    oppScore: Math.max(oppScore, 35),
    boxByPlayer,
  };
}

/* =========================================================================
   YEAR-END PROGRESSION
   ========================================================================= */
function progressRosterForNewYear(roster, incoming, team) {
  const survivors = roster
    .filter((p) => p.class !== "SR")
    .map((p) => {
      const growth = Math.round((p.attrs.potential - p.overall) * rand(0.05, 0.22));
      const bump = clamp(growth, -2, 9);
      const attrs = {
        scoring: clamp(p.attrs.scoring + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        rebounding: clamp(p.attrs.rebounding + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        playmaking: clamp(p.attrs.playmaking + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        defense: clamp(p.attrs.defense + Math.round(bump * rand(0.6, 1.2)), 25, 99),
        potential: p.attrs.potential,
      };
      const nextClass = CLASS_ORDER[CLASS_ORDER.indexOf(p.class) + 1];
      return {
        ...p,
        class: nextClass,
        attrs,
        overall: computeOverall(p.pos, attrs),
        career: {
          pts: p.career.pts + p.season.pts,
          reb: p.career.reb + p.season.reb,
          ast: p.career.ast + p.season.ast,
          gp: p.career.gp + p.season.gp,
        },
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
   PERSISTENCE
   ========================================================================= */
const SAVE_KEY = "cbb-dynasty-save";

async function saveDynasty(state) {
  try {
    await window.storage.set(SAVE_KEY, JSON.stringify(state), false);
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}
async function loadDynasty() {
  try {
    const res = await window.storage.get(SAVE_KEY, false);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}
async function deleteDynasty() {
  try { await window.storage.delete(SAVE_KEY, false); } catch (e) {}
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
  const filtered = TEAMS.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));

  return (
    <div className="cbb-root cbb-scroll" style={{ minHeight: "100vh", background: C.bg, color: C.cream, padding: "40px 24px", overflowY: "auto" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ borderBottom: `2px solid ${C.wood}`, paddingBottom: 18, marginBottom: 28 }}>
          <div className="cbb-num" style={{ fontSize: 13, letterSpacing: "0.14em", color: C.wood, fontWeight: 600 }}>DYNASTY MODE · TIP-OFF 2008</div>
          <h1 className="cbb-num" style={{ fontSize: 40, fontWeight: 700, margin: "6px 0 8px" }}>Pick your program.</h1>
          <p style={{ color: C.dim, fontSize: 15, maxWidth: 620 }}>
            Every dynasty starts in the 2007–08 season. Build the roster, sign your classes, and coach every
            season forward from there — your save carries the program year after year.
          </p>
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
              onClick={() => onPick(t)}
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
];

function DynastyApp({ initial, onExit }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [viewTeamId, setViewTeamId] = useState(null);
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
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

  function simOneGame() {
    if (!nextGame) return;
    const opp = TEAM_MAP[nextGame.oppId];
    const oppPower = teamPowerRating(opp, state.strengths, state.year);
    const result = simulateGame(state.roster, state.depthChart, oppPower);

    setState((s) => {
      const roster = s.roster.map((p) => {
        const box = result.boxByPlayer[p.id];
        if (!box) return p;
        return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + box.pts, reb: p.season.reb + box.reb, ast: p.season.ast + box.ast } };
      });
      const schedule = s.schedule.map((g) => g.id === nextGame.id
        ? { ...g, played: true, result: { win: result.win, myScore: result.myScore, oppScore: result.oppScore } }
        : g);
      const newWeekIndex = schedule.filter((g) => g.played).length + 1;
      const weeksElapsed = Math.max(0, newWeekIndex - s.recruitingWeekIndex);
      const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(s.recruitingBoard, weeksElapsed) : s.recruitingBoard;
      const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : s.recruitingPoints;
      return { ...s, roster, schedule, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex };
    });
    flash(result.win ? `Beat ${opp.name} ${result.myScore}-${result.oppScore}` : `Lost to ${opp.name} ${result.oppScore}-${result.myScore}`);
  }

  function simToEndOfSeason() {
    let cur = { ...state };
    let games = [...cur.schedule];
    let roster = [...cur.roster];
    for (const g of games) {
      if (g.played) continue;
      const opp = TEAM_MAP[g.oppId];
      const oppPower = teamPowerRating(opp, cur.strengths, cur.year);
      const result = simulateGame(roster, cur.depthChart, oppPower);
      roster = roster.map((p) => {
        const box = result.boxByPlayer[p.id];
        if (!box) return p;
        return { ...p, season: { gp: p.season.gp + 1, pts: p.season.pts + box.pts, reb: p.season.reb + box.reb, ast: p.season.ast + box.ast } };
      });
      g.played = true;
      g.result = { win: result.win, myScore: result.myScore, oppScore: result.oppScore };
    }
    setState((s) => {
      const newWeekIndex = games.filter((g) => g.played).length + 1;
      const weeksElapsed = Math.max(0, newWeekIndex - s.recruitingWeekIndex);
      const recruitingBoard = weeksElapsed > 0 ? advanceRecruitingWeeks(s.recruitingBoard, weeksElapsed) : s.recruitingBoard;
      const recruitingPoints = weeksElapsed > 0 ? weeklyRecruitingBudget(team) : s.recruitingPoints;
      return { ...s, roster, schedule: games, recruitingBoard, recruitingPoints, recruitingWeekIndex: newWeekIndex };
    });
    flash("Simulated the rest of the season.");
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
    const incomingRecruits = state.incomingCommits
      .map((id) => state.recruitingBoard.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => recruitToPlayer(r, team));

    const newRoster = progressRosterForNewYear(state.roster, incomingRecruits, team);
    const newYear = state.year + 1;
    const newStrengths = Object.fromEntries(TEAMS.map((t) => [t.id, rand(-6, 6)]));

    const seniorCount = state.roster.filter((p) => p.class === "SR").length;

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
      history: [...state.history, { year: state.year, wins: record.w, losses: record.l, teamId: state.teamId }],
    });
    flash(`Welcome to the ${newYear}-${String(newYear + 1).slice(2)} season. ${seniorCount} seniors graduated.`);
  }

  function changeJob(newTeam) {
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
      strengths: Object.fromEntries(TEAMS.map((t) => [t.id, rand(-6, 6)])),
      history: [...state.history, { year: state.year, wins: record.w, losses: record.l, teamId: state.teamId }],
    });
    setJobPickerOpen(false);
    setTab("dashboard");
    flash(`New job accepted — you're now the head coach at ${newTeam.name}.`);
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
              <div className="cbb-num" style={{ fontSize: 22, fontWeight: 700 }}>{state.year}–{String(state.year + 1).slice(2)}</div>
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
              onChangeJob={() => setJobPickerOpen(true)} />
          )}
          {tab === "roster" && <RosterTab roster={state.roster} />}
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
            />
          )}
          {tab === "schedule" && <ScheduleTab schedule={state.schedule} onViewTeam={setViewTeamId} />}
          {tab === "standings" && <StandingsTab team={team} strengths={state.strengths} userRecord={record} year={state.year} onViewTeam={setViewTeamId} />}
        </div>
      </div>

      {viewTeamId && (
        <TeamRosterModal teamId={viewTeamId} year={state.year} onClose={() => setViewTeamId(null)} />
      )}
      {jobPickerOpen && (
        <JobChangeModal
          currentTeamId={state.teamId}
          nextYear={state.year + 1}
          onPick={changeJob}
          onClose={() => setJobPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab({ state, team, record, nextGame, onSim, onSimSeason, seasonOver, onAdvanceYear, onChangeJob }) {
  const overall = Math.round(userTeamOverall(state.roster, state.depthChart));
  const topPlayer = [...state.roster].sort((a, b) => b.overall - a.overall)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatBlock label="Team Overall" value={overall} />
        <StatBlock label="Record" value={`${record.w}-${record.l}`} />
        <StatBlock label="Roster Size" value={state.roster.length} />
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
              <button onClick={onAdvanceYear} className="cbb-btn" style={btnStyle(C.gold, "#221a00")}><TrendingUp size={13} /> Advance to {state.year + 1}</button>
            </div>
          </div>
        )}
      </Panel>

      {topPlayer && (
        <Panel style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 10 }}>PROGRAM CORNERSTONE</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{topPlayer.name}</div>
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
            {state.history.map((h) => (
              <div key={h.year} style={{ border: `1px solid ${C.line}`, padding: "8px 12px", minWidth: 74 }}>
                <div className="cbb-num" style={{ fontSize: 13, color: C.dim }}>{h.year}</div>
                <div className="cbb-num" style={{ fontSize: 16, fontWeight: 600 }}>{h.wins}-{h.losses}</div>
              </div>
            ))}
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
function RosterTab({ roster }) {
  const sorted = [...roster].sort((a, b) => b.overall - a.overall);
  const realCount = roster.filter((p) => p.realName).length;
  return (
    <div>
      {realCount > 0 && (
        <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
          {realCount} of {roster.length} names on this roster came from real Torvik data (marked with •). Attributes and stats are still simulated.
        </div>
      )}
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
            <tr key={p.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}` }}>
              <td style={td}>
                <div style={{ fontWeight: 600 }}>{p.realName ? "• " : ""}{p.name}</div>
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
                  <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500 }}>{i === 0 ? "★ " : ""}{p.name}</div>
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

function RecruitingTab({ board, committedIds, points, budget, onAction, onSign, team }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [openId, setOpenId] = useState(null);
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
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {r.pos} · {r.state} · {r.hsStatline.ppg} ppg{r.originalTeam ? ` at ${r.originalTeam}` : ""}
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
function TeamRosterModal({ teamId, year, onClose }) {
  const team = TEAM_MAP[teamId];
  const roster = useMemo(() => {
    const r = buildInitialRoster(team, year);
    return [...r].sort((a, b) => b.overall - a.overall);
  }, [teamId, year]);
  const realCount = roster.filter((p) => p.realName).length;

  return (
    <Modal
      title={team.name}
      subtitle={`${team.conf} · projected ${year}–${String(year + 1).slice(2)} roster`}
      onClose={onClose}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
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
    </Modal>
  );
}

/* ---------- Coaching Job Change ---------- */
function JobChangeModal({ currentTeamId, nextYear, onPick, onClose }) {
  const [q, setQ] = useState("");
  const filtered = TEAMS
    .filter((t) => t.id !== currentTeamId && t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));

  return (
    <Modal
      title="Take another job"
      subtitle={`Leave your program to coach a new team starting in ${nextYear}–${String(nextYear + 1).slice(2)}. Your current roster stays behind.`}
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
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="cbb-btn"
            style={{
              textAlign: "left", cursor: "pointer", padding: "14px 12px",
              background: C.panelAlt, border: `1px solid ${C.line}`, borderLeft: `4px solid ${t.primary}`,
              color: C.cream, display: "flex", flexDirection: "column", gap: 6,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: C.dim }}>{t.conf}</div>
            <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ width: 12, height: 4, background: i < t.prestige ? C.wood : C.line }} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function ScheduleTab({ schedule, onViewTeam }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
        Click any opponent to preview their roster.
      </div>
    <Panel style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.dim, fontSize: 11, textAlign: "left" }}>
            <th style={th}>Wk</th><th style={th}>Opponent</th><th style={th}>Site</th><th style={th}>Result</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((g) => {
            const opp = TEAM_MAP[g.oppId];
            return (
              <tr key={g.id} className="cbb-row" style={{ borderBottom: `1px solid ${C.line}`, cursor: "pointer" }} onClick={() => onViewTeam(g.oppId)}>
                <td style={td}>{g.week}</td>
                <td style={td}><span style={{ borderBottom: `1px dotted ${C.dim}` }}>{opp.name}</span> <span style={{ color: C.dimmer, fontSize: 11 }}>({opp.conf})</span></td>
                <td style={td}>{g.home ? "Home" : "Away"}</td>
                <td style={td}>
                  {g.played ? (
                    <span style={{ color: g.result.win ? C.green : C.red, fontWeight: 600 }}>
                      {g.result.win ? "W" : "L"} {g.result.myScore}-{g.result.oppScore}
                    </span>
                  ) : <span style={{ color: C.dimmer }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
    </div>
  );
}

/* ---------- Standings ---------- */
function StandingsTab({ team, strengths, userRecord, year, onViewTeam }) {
  const rows = TEAMS.map((t) => {
    if (t.id === team.id) return { ...t, wins: userRecord.w, losses: userRecord.l, isUser: true };
    const power = teamPowerRating(t, strengths, year);
    const winPct = clamp(0.25 + (power - 55) / 110, 0.08, 0.92);
    const wins = Math.round(winPct * 28);
    return { ...t, wins, losses: 28 - wins, isUser: false };
  }).sort((a, b) => b.wins - a.wins);

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 10 }}>
        Projected national standings — other programs are simulated from a strength rating, not a full box-score sim. Click any team to preview their roster.
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
                <td style={{ ...td, fontWeight: t.isUser ? 700 : 500 }}><span style={{ borderBottom: t.isUser ? "none" : `1px dotted ${C.dim}` }}>{t.name}</span>{t.isUser ? " (you)" : ""}</td>
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

/* =========================================================================
   ROOT
   ========================================================================= */
export default function CBBDynasty() {
  const [loading, setLoading] = useState(true);
  const [savedState, setSavedState] = useState(null);
  const [session, setSession] = useState(null); // null = team select

  useEffect(() => {
    (async () => {
      const s = await loadDynasty();
      setSavedState(s);
      setLoading(false);
    })();
  }, []);

  function startDynasty(team) {
    const year = 2008;
    const roster = buildInitialRoster(team, year);
    const state = {
      teamId: team.id,
      year,
      roster,
      depthChart: defaultDepthChart(roster),
      schedule: genSchedule(team, year),
      recruitingBoard: genRecruitPool(year + 1), // board is always for the NEXT season's incoming class
      incomingCommits: [],
      recruitingPoints: weeklyRecruitingBudget(team),
      recruitingWeekIndex: 1,
      strengths: Object.fromEntries(TEAMS.map((t) => [t.id, rand(-6, 6)])),
      history: [],
    };
    setSession(state);
  }

  function exitToSelect() {
    deleteDynasty();
    setSession(null);
    setSavedState(null);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: C.bg, color: C.dim, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>Loading save…</div>;
  }

  if (session) {
    return <DynastyApp initial={session} onExit={exitToSelect} />;
  }

  if (savedState) {
    return (
      <div className="cbb-root" style={{ minHeight: "100vh", background: C.bg, color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <GlobalStyle />
        <Panel style={{ padding: 30, maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em", marginBottom: 8 }}>SAVE FOUND</div>
          <h2 className="cbb-num" style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{TEAM_MAP[savedState.teamId].name}</h2>
          <div style={{ color: C.dim, fontSize: 13, marginBottom: 20 }}>{savedState.year}–{String(savedState.year + 1).slice(2)} season in progress</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => setSession(savedState)} className="cbb-btn" style={btnStyle(C.wood)}>Continue Dynasty</button>
            <button onClick={exitToSelect} className="cbb-btn" style={btnStyle(C.panelAlt, C.cream)}>Start New</button>
          </div>
        </Panel>
      </div>
    );
  }

  return <TeamSelect onPick={startDynasty} />;
}
