#!/usr/bin/env bun
// Sword Art Click — Headless Game Evaluation
//
// Simulates the game without a browser and produces a detailed progression
// report. Useful for evaluating pacing, balance, and game feel as an agent.
//
// Usage:
//   bun scripts/evaluate.ts
//   bun scripts/evaluate.ts --minutes 90 --strategy optimal --clicks 3
//   bun scripts/evaluate.ts --minutes 30 --strategy idle
//   bun scripts/evaluate.ts --minutes 120 --strategy cheapest --prestiges 2

import type { GameState } from "../src/types.ts";
import {
  ACHIEVEMENT_DEFS,
  ARTIST_DEFS,
  MEDIA_TIERS,
  PRESTIGE_THRESHOLD,
  PRESTIGE_UPGRADE_DEFS,
  SWORD_DEFS,
  UPGRADE_DEFS,
} from "../src/data.ts";
import {
  calculateErasurePoints,
  getArtistCost,
  getEffectiveClickPower,
  getEffectivePassiveRate,
  getTotalMultiplier,
  getUpgradeCost,
} from "../src/helpers.ts";

// ─── CLI Args ─────────────────────────────────────────────────────────────────

// Bun runtime global — not in tsconfig lib since the project targets browsers
declare const Bun: { argv: string[] };
const args = Bun.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? (args[idx + 1] as string) : fallback;
}

const DURATION_MINUTES = Number(getArg("--minutes", "60"));
const STRATEGY = getArg("--strategy", "optimal") as Strategy;
const CLICKS_PER_SEC = Number(getArg("--clicks", "3"));
const MAX_PRESTIGES = Number(getArg("--prestiges", "1"));

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "optimal" | "cheapest" | "idle";
type RunPhase = "early" | "mid" | "late";
type PurchaseType = "upgrade" | "artist" | "media";

interface Candidate {
  type: PurchaseType;
  id: string;
  name: string;
  cost: number;
  roi: number; // additional strokes/sec gained per stroke spent
}

interface SimEvent {
  simTime: number;
  tag: string;
  label: string;
  detail?: string;
}

interface Snapshot {
  time: number;
  strokes: number;
  clickPower: number;
  effectiveClickPower: number;
  passiveRate: number;
  effectivePassiveRate: number;
  totalIncome: number;
  passiveFraction: number;
  mediaTier: number;
  artistCount: number;
  phase: RunPhase;
  prestigeCount: number;
}

interface DeadZone {
  start: number;
  end: number;
  waitingFor: string;
}

interface SimResult {
  events: SimEvent[];
  snapshots: Snapshot[];
  deadZones: DeadZone[];
  finalState: GameState;
  durationSecs: number;
  totalDecisionMoments: number;
  totalPurchases: number;
  prestigeTimes: number[];
}

// ─── State Management ─────────────────────────────────────────────────────────

function createState(): GameState {
  const now = Date.now();
  return {
    strokes: 0,
    totalStrokes: 0,
    totalClicks: 0,
    clickPower: 1,
    passiveRate: 0,
    upgrades: {},
    artists: {},
    mediaTier: 0,
    unlockedSwords: ["butterKnife"],
    unlockedAchievements: [],
    lastSave: now,
    playStartTime: now,
    erasurePoints: 0,
    totalErasurePoints: 0,
    prestigeCount: 0,
    prestigeUpgrades: {},
    lifetimeStrokes: 0,
    prestigeConfirming: false,
    prestigeConfirmTimer: 0,
    resetConfirming: false,
    resetConfirmTimer: 0,
  };
}

// ─── Simulation-specific helpers ──────────────────────────────────────────────
// Core math (getTotalMultiplier, getEffectiveClickPower, etc.) is imported from
// src/helpers.ts — no duplication.

function totalIncomeRate(s: GameState, cps: number): number {
  return getEffectivePassiveRate(s) + getEffectiveClickPower(s) * cps;
}

function passiveFraction(s: GameState, cps: number): number {
  const total = totalIncomeRate(s, cps);
  if (total === 0) return 0;
  return getEffectivePassiveRate(s) / total;
}

function getRunPhase(s: GameState): RunPhase {
  const isLate =
    s.totalStrokes >= PRESTIGE_THRESHOLD ||
    s.mediaTier >= 4 ||
    s.totalStrokes >= 1_000_000 ||
    s.prestigeCount > 0;
  if (isLate) return "late";
  const isMid =
    s.totalStrokes >= 20_000 || s.totalClicks >= 250 || s.mediaTier >= 2;
  return isMid ? "mid" : "early";
}

function totalArtists(s: GameState): number {
  return Object.values(s.artists).reduce((a, b) => a + b, 0);
}

// ─── Purchase Candidates ──────────────────────────────────────────────────────

function getCandidates(s: GameState, cps: number): Candidate[] {
  const candidates: Candidate[] = [];
  const mult = getTotalMultiplier(s);
  const muscleMemory = 1 + (s.prestigeUpgrades["muscleMemory"] ?? 0) * 0.1;
  const totalRate = totalIncomeRate(s, cps);

  // Click upgrades
  for (const def of UPGRADE_DEFS) {
    const cost = getUpgradeCost(def, s);
    const addedClickIncome = def.effect.value * mult * muscleMemory * cps;
    const roi = cost > 0 ? addedClickIncome / cost : 0;
    candidates.push({ type: "upgrade", id: def.id, name: def.name, cost, roi });
  }

  // Artists
  for (const def of ARTIST_DEFS) {
    const cost = getArtistCost(def, s);
    const addedPassive = def.baseRate * mult;
    const artSchool = 1 + (s.prestigeUpgrades["artSchool"] ?? 0) * 0.25;
    const roi = cost > 0 ? (addedPassive * artSchool) / cost : 0;
    candidates.push({ type: "artist", id: def.id, name: def.name, cost, roi });
  }

  // Next media tier
  const nextTier = s.mediaTier + 1;
  if (nextTier < MEDIA_TIERS.length) {
    const tierDef = MEDIA_TIERS[nextTier];
    if (tierDef) {
      const currMult = MEDIA_TIERS[s.mediaTier]?.multiplier ?? 1;
      const nextMult = tierDef.multiplier;
      // Gain = current income * (new_mult/curr_mult - 1) + current income * (new_mult/curr_mult - 1)
      // Simplified: everything scales by newMult/currMult
      const multiplierGain = nextMult / currMult - 1;
      const addedIncome = totalRate * multiplierGain;
      const roi = tierDef.cost > 0 ? addedIncome / tierDef.cost : 0;
      candidates.push({
        type: "media",
        id: tierDef.id,
        name: tierDef.name,
        cost: tierDef.cost,
        roi,
      });
    }
  }

  return candidates;
}

function selectBest(affordable: Candidate[], strategy: Strategy): Candidate {
  if (strategy === "cheapest") {
    return affordable.reduce((a, b) => (a.cost < b.cost ? a : b));
  }
  // "optimal": highest ROI (strokes/sec gained per stroke spent)
  return affordable.reduce((a, b) => (a.roi > b.roi ? a : b));
}

// ─── Apply Purchase ───────────────────────────────────────────────────────────

// Milestone counts at which we log a purchase event (first buy + round numbers)
const BUY_MILESTONES = new Set([1, 5, 10, 25, 50, 100, 200, 500]);
function isBuyMilestone(n: number): boolean {
  if (BUY_MILESTONES.has(n)) return true;
  if (n >= 1000 && n % 500 === 0) return true;
  return false;
}

function applyPurchase(
  c: Candidate,
  s: GameState,
  events: SimEvent[],
  simTime: number
): void {
  s.strokes -= c.cost;

  if (c.type === "upgrade") {
    const def = UPGRADE_DEFS.find((d) => d.id === c.id)!;
    s.upgrades[c.id] = (s.upgrades[c.id] ?? 0) + 1;
    s.clickPower += def.effect.value;
    const newCount = s.upgrades[c.id]!;
    if (isBuyMilestone(newCount)) {
      events.push({
        simTime,
        tag: "BUY",
        label: `${def.name} ×${newCount}`,
        detail: `cost ${fmtNum(c.cost)} · click power now ${s.clickPower}`,
      });
    }
  } else if (c.type === "artist") {
    const def = ARTIST_DEFS.find((d) => d.id === c.id)!;
    s.artists[c.id] = (s.artists[c.id] ?? 0) + 1;
    s.passiveRate += def.baseRate;
    const newCount = s.artists[c.id]!;
    if (isBuyMilestone(newCount)) {
      events.push({
        simTime,
        tag: "HIRE",
        label: `${def.name} ×${newCount}`,
        detail: `cost ${fmtNum(c.cost)} · passive +${fmtNum(def.baseRate)}/s · total ${fmtNum(s.passiveRate)}/s base`,
      });
    }
  } else if (c.type === "media") {
    s.mediaTier += 1;
    const tierDef = MEDIA_TIERS[s.mediaTier]!;
    events.push({
      simTime,
      tag: "MEDIA",
      label: `${tierDef.name} (tier ${s.mediaTier})`,
      detail: `cost ${fmtNum(c.cost)} · multiplier ×${tierDef.multiplier}`,
    });
  }
}

// ─── Prestige ─────────────────────────────────────────────────────────────────

function spendPrestigePoints(s: GameState): void {
  // Simple heuristic: buy speedSketch if we can afford it, else artSchool, else muscleMemory
  let changed = true;
  while (changed) {
    changed = false;
    for (const def of PRESTIGE_UPGRADE_DEFS) {
      const owned = s.prestigeUpgrades[def.id] ?? 0;
      if (owned >= def.maxLevel) continue;
      const cost = Math.floor(def.baseCost * Math.pow(1.5, owned));
      if (s.erasurePoints >= cost) {
        s.erasurePoints -= cost;
        s.prestigeUpgrades[def.id] = owned + 1;
        changed = true;
      }
    }
  }
}

function doPrestige(s: GameState, events: SimEvent[], simTime: number): void {
  const earned = calculateErasurePoints(s.totalStrokes);
  s.lifetimeStrokes += s.totalStrokes;
  s.erasurePoints += earned;
  s.totalErasurePoints += earned;
  s.prestigeCount += 1;

  // Spend LP before resetting
  spendPrestigePoints(s);

  const lpSpent = earned - s.erasurePoints;
  const prestigeUpgradesSummary = Object.entries(s.prestigeUpgrades)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const def = PRESTIGE_UPGRADE_DEFS.find((d) => d.id === k);
      return `${def?.name ?? k} ×${v}`;
    })
    .join(", ");

  events.push({
    simTime,
    tag: "PRESTIGE",
    label: `Ascension #${s.prestigeCount}`,
    detail: `+${earned} LP earned · ${lpSpent} LP spent · Upgrades: ${prestigeUpgradesSummary || "none"}`,
  });

  // Reset
  s.strokes = 0;
  s.totalStrokes = 0;
  s.totalClicks = 0;
  s.clickPower = 1;
  s.passiveRate = 0;
  s.upgrades = {};
  // Artists persist
  for (const def of ARTIST_DEFS) {
    const owned = s.artists[def.id] ?? 0;
    s.passiveRate += def.baseRate * owned;
  }
  // Media tier resets (keep tier 1 if betterPaper)
  s.mediaTier = (s.prestigeUpgrades["betterPaper"] ?? 0) >= 1 ? 1 : 0;
  // Swords reset (keep if portfolio)
  if ((s.prestigeUpgrades["portfolio"] ?? 0) < 1) {
    s.unlockedSwords = ["butterKnife"];
  }
  s.prestigeConfirming = false;
  s.resetConfirming = false;
}

// ─── Time Advancement ─────────────────────────────────────────────────────────

// Advance state by `secs` seconds of passive income + clicking
function advanceTime(s: GameState, secs: number, cps: number): void {
  const passiveGain = getEffectivePassiveRate(s) * secs;
  const clickGain = getEffectiveClickPower(s) * cps * secs;
  const clicks = Math.floor(cps * secs);

  s.strokes += passiveGain + clickGain;
  s.totalStrokes += passiveGain + clickGain;
  s.totalClicks += clicks;
}

// ─── Sword & Achievement Checks ───────────────────────────────────────────────

function checkSwords(s: GameState, events: SimEvent[], simTime: number): void {
  for (const def of SWORD_DEFS) {
    if (!s.unlockedSwords.includes(def.id) && s.totalStrokes >= def.threshold) {
      s.unlockedSwords.push(def.id);
      events.push({
        simTime,
        tag: "SWORD",
        label: def.name,
        detail: `unlocked at ${fmtNum(def.threshold)} total strokes · +${def.bonus}% production`,
      });
    }
  }
}

function checkAchievements(
  s: GameState,
  events: SimEvent[],
  simTime: number
): void {
  for (const def of ACHIEVEMENT_DEFS) {
    if (s.unlockedAchievements.includes(def.id)) continue;
    const unlocked =
      def.id === "drawnOut"
        ? simTime >= 30 * 60
        : def.check(s);
    if (unlocked) {
      s.unlockedAchievements.push(def.id);
      events.push({
        simTime,
        tag: "ACHIEVE",
        label: def.name,
        detail: def.desc,
      });
    }
  }
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function simulate(): SimResult {
  const s = createState();
  const events: SimEvent[] = [];
  const snapshots: Snapshot[] = [];
  const deadZones: DeadZone[] = [];
  const prestigeTimes: number[] = [];

  let simTime = 0;
  const maxTime = DURATION_MINUTES * 60;
  // idle = minimal clicking (1 click every 2s) — represents going idle after initial setup
  // active strategies use the configured clicks/sec
  const cps = STRATEGY === "idle" ? 0.5 : CLICKS_PER_SEC;

  let prevPhase: RunPhase = "early";
  let deadZoneStart: number | null = null;
  let deadZoneTarget = "";
  let totalDecisionMoments = 0;
  let totalPurchases = 0;
  let lastSnapshotTime = -Infinity;

  const cpsLabel =
    STRATEGY === "idle"
      ? "0.5 clicks/sec (idle — minimal engagement)"
      : `${cps} clicks/sec`;
  events.push({
    simTime: 0,
    tag: "START",
    label: "Game begins",
    detail: `strategy: ${STRATEGY} · ${cpsLabel}`,
  });

  // Initial sword check (butter knife at 0)
  checkSwords(s, events, simTime);

  while (simTime < maxTime) {
    // Snapshot every 5 minutes
    if (simTime - lastSnapshotTime >= 300) {
      snapshots.push({
        time: simTime,
        strokes: s.strokes,
        clickPower: s.clickPower,
        effectiveClickPower: getEffectiveClickPower(s),
        passiveRate: s.passiveRate,
        effectivePassiveRate: getEffectivePassiveRate(s),
        totalIncome: totalIncomeRate(s, cps),
        passiveFraction: passiveFraction(s, cps),
        mediaTier: s.mediaTier,
        artistCount: totalArtists(s),
        phase: getRunPhase(s),
        prestigeCount: s.prestigeCount,
      });
      lastSnapshotTime = simTime;
    }

    // Prestige check
    if (
      s.totalStrokes >= PRESTIGE_THRESHOLD &&
      s.prestigeCount < MAX_PRESTIGES
    ) {
      prestigeTimes.push(simTime);
      doPrestige(s, events, simTime);
      deadZoneStart = null; // reset dead zone tracking after prestige
      prevPhase = getRunPhase(s);
      continue;
    }

    // Get all candidates and find affordable ones
    const candidates = getCandidates(s, cps);
    const affordable = candidates.filter((c) => c.cost <= s.strokes);

    if (affordable.length > 0) {
      // Close dead zone if one was open
      if (deadZoneStart !== null) {
        const duration = simTime - deadZoneStart;
        if (duration > 120) {
          deadZones.push({
            start: deadZoneStart,
            end: simTime,
            waitingFor: deadZoneTarget,
          });
        }
        deadZoneStart = null;
      }

      // Count decision moments (>= 2 affordable options)
      if (affordable.length >= 2) totalDecisionMoments++;
      totalPurchases++;

      const best = selectBest(affordable, STRATEGY);
      applyPurchase(best, s, events, simTime);
    } else {
      // Nothing affordable — find cheapest reachable target and fast-forward
      const reachable = candidates.filter((c) => c.cost > 0);
      if (reachable.length === 0) {
        simTime += 60;
        continue;
      }

      const cheapest = reachable.reduce((a, b) => (a.cost < b.cost ? a : b));
      const needed = cheapest.cost - s.strokes;
      const rate = totalIncomeRate(s, cps);

      if (rate <= 0) {
        // Completely stuck (no income, no clicking)
        events.push({
          simTime,
          tag: "STUCK",
          label: "No income — cannot progress",
          detail: "needs at least one click or artist",
        });
        break;
      }

      const waitSecs = needed / rate;

      // Open dead zone tracking (only flag waits > 2 minutes)
      if (deadZoneStart === null && waitSecs > 120) {
        deadZoneStart = simTime;
        deadZoneTarget = cheapest.name;
      }

      // Advance by the wait time (capped to avoid huge jumps for readability)
      const step = Math.min(waitSecs, maxTime - simTime, 600);
      advanceTime(s, step, cps);
      simTime += step;

      if (step < waitSecs) continue; // didn't reach the target yet
    }

    // Check swords, achievements, phase after each action
    checkSwords(s, events, simTime);
    checkAchievements(s, events, simTime);

    const phase = getRunPhase(s);
    if (phase !== prevPhase) {
      events.push({
        simTime,
        tag: "PHASE",
        label: `Phase → ${phase.toUpperCase()}`,
        detail: phaseDescription(phase),
      });
      prevPhase = phase;
    }
  }

  // Final snapshot
  snapshots.push({
    time: simTime,
    strokes: s.strokes,
    clickPower: s.clickPower,
    effectiveClickPower: getEffectiveClickPower(s),
    passiveRate: s.passiveRate,
    effectivePassiveRate: getEffectivePassiveRate(s),
    totalIncome: totalIncomeRate(s, cps),
    passiveFraction: passiveFraction(s, cps),
    mediaTier: s.mediaTier,
    artistCount: totalArtists(s),
    phase: getRunPhase(s),
    prestigeCount: s.prestigeCount,
  });

  return {
    events,
    snapshots,
    deadZones,
    finalState: s,
    durationSecs: simTime,
    totalDecisionMoments,
    totalPurchases,
    prestigeTimes,
  };
}

function phaseDescription(phase: RunPhase): string {
  const descs: Record<RunPhase, string> = {
    early: "Minimal tools. Build rhythm with deliberate strokes.",
    mid: "The floor is busy. Throughput matters now.",
    late: "The run bends toward ritual and transcendence.",
  };
  return descs[phase];
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (n < 1_000) return Math.floor(n).toString();
  const suffixes = ["", "K", "M", "B", "T"];
  const tier = Math.min(
    Math.floor(Math.log10(Math.abs(n)) / 3),
    suffixes.length - 1
  );
  if (tier === 0) return Math.floor(n).toString();
  const suffix = suffixes[tier] ?? `e${tier * 3}`;
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffix;
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ─── Report Output ────────────────────────────────────────────────────────────

function printReport(result: SimResult): void {
  const { events, snapshots, deadZones, finalState: s, totalDecisionMoments, totalPurchases, prestigeTimes } = result;
  const hr = "─".repeat(60);
  const hr2 = "═".repeat(60);

  console.log();
  console.log(hr2);
  console.log("  SWORD ART CLICK — GAME EVALUATION REPORT");
  console.log(hr2);
  const stratLabel =
    STRATEGY === "idle"
      ? "idle (0.5 cps — minimal engagement)"
      : `${STRATEGY} · ${CLICKS_PER_SEC} clicks/sec`;
  console.log(`  Strategy : ${stratLabel}`);
  console.log(`  Duration : ${DURATION_MINUTES} min simulated`);
  console.log(`  Max prestiges : ${MAX_PRESTIGES}`);
  console.log();

  // ── Timeline ──────────────────────────────────────────────────────────────
  console.log(hr);
  console.log("  TIMELINE");
  console.log(hr);
  for (const e of events) {
    const time = fmtTime(e.simTime).padStart(8);
    const tag = `[${e.tag}]`.padEnd(10);
    const detail = e.detail ? `  ·  ${e.detail}` : "";
    console.log(`  ${time}  ${tag}  ${e.label}${detail}`);
  }
  console.log();

  // ── Income Snapshots ──────────────────────────────────────────────────────
  console.log(hr);
  console.log("  INCOME SNAPSHOTS (every 5 minutes)");
  console.log(hr);
  console.log(
    "  Time       Effective Click  Passive/s   Total/s    Idle%  Media  Artists  Phase     Prestige"
  );
  console.log(
    "  " + "─".repeat(95)
  );
  for (const snap of snapshots) {
    const t = fmtTime(snap.time).padStart(8);
    const ec = fmtNum(snap.effectiveClickPower).padStart(8);
    const ep = fmtNum(snap.effectivePassiveRate).padStart(11);
    const ti = fmtNum(snap.totalIncome).padStart(10);
    const pf = fmtPct(snap.passiveFraction).padStart(6);
    const tier = MEDIA_TIERS[snap.mediaTier]?.name.slice(0, 11).padEnd(11) ?? "?";
    const arts = String(snap.artistCount).padStart(7);
    const phase = snap.phase.padEnd(9);
    const pcount = snap.prestigeCount > 0 ? `#${snap.prestigeCount}` : "-";
    console.log(
      `  ${t}  ${ec}/click ${ep}   ${ti}   ${pf}  ${tier}  ${arts}  ${phase}  ${pcount}`
    );
  }
  console.log();

  // ── Progression Milestones ────────────────────────────────────────────────
  console.log(hr);
  console.log("  CONTENT REACHED");
  console.log(hr);

  const mediaTiersReached = Array.from(new Set(snapshots.map((s) => s.mediaTier)));
  console.log("  Media tiers:");
  for (const tierIdx of mediaTiersReached) {
    const def = MEDIA_TIERS[tierIdx];
    if (!def) continue;
    const reachEvent = events.find(
      (e) => e.tag === "MEDIA" && e.label.includes(def.name)
    );
    const when = reachEvent ? `@ ${fmtTime(reachEvent.simTime)}` : "@ start";
    console.log(`    Tier ${tierIdx}: ${def.name.padEnd(18)} ${when}  ×${def.multiplier} multiplier`);
  }
  const maxTier = Math.max(...mediaTiersReached);
  for (let i = maxTier + 1; i < MEDIA_TIERS.length; i++) {
    const def = MEDIA_TIERS[i];
    if (def) console.log(`    Tier ${i}: ${def.name.padEnd(18)} NOT REACHED  (costs ${fmtNum(def.cost)})`);
  }
  console.log();

  console.log("  Swords unlocked:");
  for (const def of SWORD_DEFS) {
    const unlocked = s.unlockedSwords.includes(def.id);
    const event = events.find((e) => e.tag === "SWORD" && e.label === def.name);
    if (unlocked) {
      const when = event ? `@ ${fmtTime(event.simTime)}` : "@ start";
      console.log(`    ✓ ${def.name.padEnd(22)} ${when}  +${def.bonus}%`);
    } else {
      console.log(
        `    ✗ ${def.name.padEnd(22)} NOT REACHED  (needs ${fmtNum(def.threshold)} strokes)`
      );
    }
  }
  console.log();

  console.log("  Achievements unlocked:");
  for (const def of ACHIEVEMENT_DEFS) {
    const unlocked = s.unlockedAchievements.includes(def.id);
    const event = events.find((e) => e.tag === "ACHIEVE" && e.label === def.name);
    const when = event ? `@ ${fmtTime(event.simTime)}` : "";
    const mark = unlocked ? "✓" : "✗";
    console.log(`    ${mark} ${def.name.padEnd(38)} ${when}`);
  }
  console.log();

  console.log("  Artists hired (final state):");
  for (const def of ARTIST_DEFS) {
    const count = s.artists[def.id] ?? 0;
    const bar = "█".repeat(Math.min(count, 20));
    console.log(`    ${def.name.padEnd(22)} ×${String(count).padStart(3)}  ${bar}`);
  }
  console.log();

  if (prestigeTimes.length > 0) {
    console.log("  Prestige timeline:");
    for (let i = 0; i < prestigeTimes.length; i++) {
      console.log(`    Prestige #${i + 1} @ ${fmtTime(prestigeTimes[i]!)}`);
    }
    console.log();
  }

  // ── Pacing Analysis ───────────────────────────────────────────────────────
  console.log(hr);
  console.log("  PACING ANALYSIS");
  console.log(hr);

  // Phase durations
  const phaseEvents = events.filter((e) => e.tag === "PHASE" || e.tag === "START");
  console.log("  Phase durations:");
  let prevPhaseTime = 0;
  let prevPhaseName = "early";
  for (const e of events) {
    if (e.tag !== "PHASE") continue;
    const dur = e.simTime - prevPhaseTime;
    console.log(
      `    ${prevPhaseName.toUpperCase().padEnd(8)} : ${fmtTime(prevPhaseTime)} → ${fmtTime(e.simTime)}  (${fmtTime(dur)})`
    );
    prevPhaseTime = e.simTime;
    prevPhaseName = e.label.split("→")[1]?.trim().toLowerCase() ?? prevPhaseName;
  }
  const finalDur = result.durationSecs - prevPhaseTime;
  console.log(
    `    ${prevPhaseName.toUpperCase().padEnd(8)} : ${fmtTime(prevPhaseTime)} → ${fmtTime(result.durationSecs)}  (${fmtTime(finalDur)})`
  );
  console.log();

  // Dead zones
  const totalDeadTime = deadZones.reduce(
    (acc, dz) => acc + (dz.end - dz.start),
    0
  );
  const deadPct = result.durationSecs > 0 ? totalDeadTime / result.durationSecs : 0;
  console.log(`  Dead zones (waiting >20s with nothing to buy): ${deadZones.length}`);
  if (deadZones.length > 0) {
    for (const dz of deadZones) {
      const dur = dz.end - dz.start;
      console.log(
        `    ${fmtTime(dz.start)} → ${fmtTime(dz.end)}  (${fmtTime(dur)})  waiting for: ${dz.waitingFor}`
      );
    }
    console.log(
      `  Total dead time: ${fmtTime(totalDeadTime)}  (${fmtPct(deadPct)} of session)`
    );
  }
  console.log();

  console.log(`  Total purchases made     : ${totalPurchases.toLocaleString()}`);
  if (result.durationSecs > 0 && totalPurchases > 0) {
    const avgBetween = result.durationSecs / totalPurchases;
    console.log(`  Avg time between buys    : ${fmtTime(avgBetween)}`);
  }
  console.log(`  Decision moments (≥2 affordable options): ${totalDecisionMoments}`);
  if (result.durationSecs > 0 && totalDecisionMoments > 0) {
    const avgFreq = result.durationSecs / totalDecisionMoments;
    console.log(`  Avg decision frequency   : every ${fmtTime(avgFreq)}`);
  }
  console.log();

  // ── Balance Flags ─────────────────────────────────────────────────────────
  console.log(hr);
  console.log("  BALANCE FLAGS");
  console.log(hr);

  const flags: { warn: boolean; msg: string }[] = [];

  // Check dead zone percentage
  if (deadPct > 0.2)
    flags.push({
      warn: true,
      msg: `High dead time: ${fmtPct(deadPct)} of session spent waiting — pacing may feel slow`,
    });
  else if (deadPct < 0.05)
    flags.push({
      warn: false,
      msg: `Low dead time (${fmtPct(deadPct)}) — always something to buy, good purchase density`,
    });
  else
    flags.push({
      warn: false,
      msg: `Dead time: ${fmtPct(deadPct)} — reasonable pacing`,
    });

  // Check passive vs click income balance at end
  const finalSnap = snapshots[snapshots.length - 1];
  if (finalSnap) {
    const pf = finalSnap.passiveFraction;
    if (pf < 0.5)
      flags.push({
        warn: true,
        msg: `Clicking dominates at end (${fmtPct(pf)} passive) — passive income may be too weak`,
      });
    else if (pf > 0.98)
      flags.push({
        warn: false,
        msg: `Passive income dominates (${fmtPct(pf)}) at end — idle-friendly, clicking is supplemental`,
      });
    else
      flags.push({
        warn: false,
        msg: `Healthy click/passive split: ${fmtPct(pf)} passive at end of session`,
      });
  }

  // Check prestige timing
  if (prestigeTimes.length > 0) {
    const firstPrestige = prestigeTimes[0]!;
    const pctOfSession = firstPrestige / result.durationSecs;
    if (pctOfSession < 0.4)
      flags.push({
        warn: true,
        msg: `First prestige at ${fmtPct(pctOfSession)} of session (${fmtTime(firstPrestige)}) — may feel rushed`,
      });
    else
      flags.push({
        warn: false,
        msg: `First prestige at ${fmtTime(firstPrestige)} (${fmtPct(pctOfSession)} of session) — feels paced`,
      });
  } else if (MAX_PRESTIGES > 0) {
    flags.push({
      warn: true,
      msg: `Prestige not reached in ${DURATION_MINUTES} min — may need balance pass to reach 10M strokes`,
    });
  }

  // Check if any artists are never hired
  for (const def of ARTIST_DEFS) {
    const count = s.artists[def.id] ?? 0;
    if (count === 0) {
      flags.push({
        warn: true,
        msg: `Artist never hired: ${def.name} (base cost ${fmtNum(def.baseCost)}) — may be unreachable`,
      });
    }
  }

  // Check early game speed (how fast do we get first artist)
  const firstHire = events.find((e) => e.tag === "HIRE");
  if (firstHire && firstHire.simTime > 120) {
    flags.push({
      warn: true,
      msg: `First artist hired at ${fmtTime(firstHire.simTime)} — early game may feel slow`,
    });
  } else if (firstHire) {
    flags.push({
      warn: false,
      msg: `First artist hired at ${fmtTime(firstHire.simTime)} — early game has quick first milestone`,
    });
  }

  // Check media tier gap (Pencil→Charcoal: 0→100 is fine, check others)
  const mediaCosts = MEDIA_TIERS.map((t) => t.cost);
  for (let i = 1; i < mediaCosts.length - 1; i++) {
    const ratio = (mediaCosts[i + 1] ?? 1) / Math.max(mediaCosts[i] ?? 1, 1);
    if (ratio > 100) {
      flags.push({
        warn: true,
        msg: `Large cost gap: ${MEDIA_TIERS[i]?.name} (${fmtNum(mediaCosts[i] ?? 0)}) → ${MEDIA_TIERS[i + 1]?.name} (${fmtNum(mediaCosts[i + 1] ?? 0)})  ratio: ×${Math.round(ratio)}`,
      });
    }
  }

  // Check for media tiers that boost but were never reached
  const maxMediaReached = Math.max(...snapshots.map((s) => s.mediaTier));
  if (maxMediaReached < MEDIA_TIERS.length - 1) {
    const nextUnreached = MEDIA_TIERS[maxMediaReached + 1];
    if (nextUnreached) {
      flags.push({
        warn: false,
        msg: `${MEDIA_TIERS.length - 1 - maxMediaReached} media tier(s) not reached — next: ${nextUnreached.name} at ${fmtNum(nextUnreached.cost)} strokes`,
      });
    }
  }

  for (const f of flags) {
    console.log(`  ${f.warn ? "⚠" : "✓"} ${f.msg}`);
  }
  console.log();

  // ── Final State Summary ───────────────────────────────────────────────────
  console.log(hr);
  console.log("  FINAL STATE SUMMARY");
  console.log(hr);
  const fs = finalSnap;
  if (fs) {
    console.log(
      `  Time elapsed    : ${fmtTime(result.durationSecs)}  (${DURATION_MINUTES} min simulated)`
    );
    console.log(`  Total strokes   : ${fmtNum(s.totalStrokes + s.lifetimeStrokes)} lifetime`);
    console.log(`  Media tier      : ${s.mediaTier} (${MEDIA_TIERS[s.mediaTier]?.name})`);
    console.log(`  Swords          : ${s.unlockedSwords.length}/${SWORD_DEFS.length}`);
    console.log(
      `  Achievements    : ${s.unlockedAchievements.length}/${ACHIEVEMENT_DEFS.length}`
    );
    console.log(`  Total artists   : ${totalArtists(s)}`);
    console.log(`  Prestige count  : ${s.prestigeCount}`);
    if (s.prestigeCount > 0) {
      const upgSummary = Object.entries(s.prestigeUpgrades)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const def = PRESTIGE_UPGRADE_DEFS.find((d) => d.id === k);
          return `${def?.name ?? k} ×${v}`;
        })
        .join(", ");
      console.log(`  Prestige upgrades: ${upgSummary || "none"}`);
    }
    console.log(`  Effective click : ${fmtNum(fs.effectiveClickPower)}/click`);
    console.log(`  Effective passive: ${fmtNum(fs.effectivePassiveRate)}/sec`);
    console.log(`  Total income    : ${fmtNum(fs.totalIncome)}/sec`);
  }
  console.log();
  console.log(hr2);
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const result = simulate();
printReport(result);
