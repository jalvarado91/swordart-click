// Sword Art Click — Static data definitions

import type {
  AchievementDef,
  ArtistDef,
  GameState,
  MediaTier,
  PrestigeUpgradeDef,
  SwordDef,
  UpgradeDef,
} from "./types.ts";

export const SAVE_KEY = "swordArtClick_save";
export const SAVE_INTERVAL = 30_000;
export const TICK_RATE = 100;
export const COST_SCALE = 1.155;
export const ARTIST_COST_SCALE = 1.15;
export const MAX_OFFLINE_HOURS = 8;
export const COLLAPSE_KEY = "swordArtClick_collapsed";
export const PRESTIGE_THRESHOLD = 2_300_000_000;

export const MEDIA_TIERS: MediaTier[] = [
  {
    id: "pencil",
    name: "Pencil Sketch",
    multiplier: 1,
    cost: 0,
    desc: "Simple graphite on paper",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    multiplier: 2,
    cost: 500,
    desc: "Smudgy but soulful",
  },
  {
    id: "ink",
    name: "Ink & Quill",
    multiplier: 6,
    cost: 10_000,
    desc: "Permanent and precise",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    multiplier: 25,
    cost: 150_000,
    desc: "Flowing and unpredictable",
  },
  {
    id: "oil",
    name: "Oil Painting",
    multiplier: 100,
    cost: 3_000_000,
    desc: "Rich, layered masterwork",
  },
  {
    id: "digital",
    name: "Digital Art",
    multiplier: 800,
    cost: 125_000_000,
    desc: "Ctrl+Z is your best friend",
  },
  {
    id: "neural",
    name: "Neural Art",
    multiplier: 4_000,
    cost: 1_500_000_000,
    desc: "The model learned from your swords",
  },
  {
    id: "ai",
    name: "AI-Generated",
    multiplier: 20_000,
    cost: 10_000_000_000,
    desc: "You've become what you swore to destroy",
  },
];

export const SWORD_DEFS: SwordDef[] = [
  {
    id: "butterKnife",
    name: "Butter Knife",
    desc: "Everyone starts somewhere",
    threshold: 0,
    bonus: 0,
  },
  {
    id: "letterOpener",
    name: "Letter Opener",
    desc: "The pen is... adjacent to the sword",
    threshold: 100,
    bonus: 2,
  },
  {
    id: "broadsword",
    name: "Broadsword",
    desc: "Wide strokes",
    threshold: 2_000,
    bonus: 5,
  },
  {
    id: "swordfish",
    name: "Swordfish",
    desc: "Something smells fishy about this one",
    threshold: 20_000,
    bonus: 5,
  },
  {
    id: "crosswordSword",
    name: "Crossword Sword",
    desc: "4 across: pointy weapon",
    threshold: 150_000,
    bonus: 8,
  },
  {
    id: "passwordSword",
    name: "Password Sword",
    desc: "Must contain 1 uppercase, 1 number, and 1 hilt",
    threshold: 750_000,
    bonus: 10,
  },
  {
    id: "swordOfDamocles",
    name: "Sword of Damocles",
    desc: "Hangs over your head while you draw",
    threshold: 4_000_000,
    bonus: 12,
  },
  {
    id: "excalibur",
    name: "Excalibur",
    desc: "Pulled from a pencil case",
    threshold: 30_000_000,
    bonus: 15,
  },
  {
    id: "lightsaber",
    name: "Lightsaber",
    desc: "Technically not a sword. We'll allow it.",
    threshold: 250_000_000,
    bonus: 18,
  },
  {
    id: "penSword",
    name: "Pen Sword",
    desc: "Mightier than itself. A paradox.",
    threshold: 5_500_000_000,
    bonus: 25,
  },
];

export const ARTIST_DEFS: ArtistDef[] = [
  {
    id: "doodler",
    name: "Doodler",
    desc: "Scribbles in the margins",
    baseCost: 15,
    baseRate: 0.5,
  },
  {
    id: "sketchArtist",
    name: "Sketch Artist",
    desc: "Quick hands, quick lines",
    baseCost: 100,
    baseRate: 2.5,
  },
  {
    id: "caricaturist",
    name: "Caricaturist",
    desc: "Exaggerates every detail",
    baseCost: 750,
    baseRate: 11,
  },
  {
    id: "storyboarder",
    name: "Storyboarder",
    desc: "Panel by panel, blade by blade",
    baseCost: 3_500,
    baseRate: 25,
  },
  {
    id: "illustrator",
    name: "Illustrator",
    desc: "Turns words into blades",
    baseCost: 12_000,
    baseRate: 42,
  },
  {
    id: "artDirector",
    name: "Art Director",
    desc: "Points at things and calls it work",
    baseCost: 35_000,
    baseRate: 105,
  },
  {
    id: "courtPainter",
    name: "Court Painter",
    desc: "By royal appointment",
    baseCost: 150_000,
    baseRate: 210,
  },
  {
    id: "renaissanceMaster",
    name: "Renaissance Master",
    desc: "A true polymath of pointy things",
    baseCost: 1_500_000,
    baseRate: 1_200,
  },
  {
    id: "swordSwallower",
    name: "Sword Swallower",
    desc: "Draws swords differently",
    baseCost: 20_000_000,
    baseRate: 6_000,
  },
  {
    id: "bobRoss",
    name: "Bob Ross",
    desc: "Happy little swords",
    baseCost: 500_000_000,
    baseRate: 38_000,
  },
];

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "pencilSharpener",
    name: "Pencil Sharpener",
    desc: "A sharper point means bolder strokes. +1 per click.",
    baseCost: 10,
    effect: { type: "click", value: 1 },
  },
  {
    id: "finePoint",
    name: "Fine Point Pen",
    desc: "Precision is an art form. +3 per click.",
    baseCost: 75,
    effect: { type: "click", value: 3 },
  },
  {
    id: "calligraphy",
    name: "Calligraphy Set",
    desc: "Every stroke is deliberate. +8 per click.",
    baseCost: 700,
    effect: { type: "click", value: 8 },
  },
  {
    id: "inkBrush",
    name: "Ink Brush",
    desc: "Broad, confident strokes. +14 per click.",
    baseCost: 16_000,
    effect: { type: "click", value: 14 },
  },
  {
    id: "precisionBlade",
    name: "Precision Blade",
    desc: "A single perfect edge. +25 per click.",
    baseCost: 900_000,
    effect: { type: "click", value: 25 },
  },
];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "firstStroke",
    name: "First Stroke",
    desc: "Draw your first sword",
    check: (s: GameState) => s.totalClicks >= 1,
  },
  {
    id: "sharpWit",
    name: "Sharp Wit",
    desc: "Reach 1,000 Strokes",
    check: (s: GameState) => s.totalStrokes >= 1_000,
  },
  {
    id: "cuttingEdge",
    name: "Cutting Edge",
    desc: "Buy your first media upgrade",
    check: (s: GameState) => s.mediaTier >= 1,
  },
  {
    id: "artOfWar",
    name: "The Art of War",
    desc: "Own 10 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 10;
    },
  },
  {
    id: "sketchyBusiness",
    name: "Sketchy Business",
    desc: "Click 5,000 times",
    check: (s: GameState) => s.totalClicks >= 5_000,
  },
  {
    id: "drawnOut",
    name: "Drawn Out",
    desc: "Play for 30 minutes",
    check: (s: GameState) => Date.now() - s.playStartTime >= 30 * 60 * 1000,
  },
  {
    id: "fineLine",
    name: "A Fine Line",
    desc: "Reach 1,000,000 Strokes",
    check: (s: GameState) => s.totalStrokes >= 1_000_000,
  },
  {
    id: "foiledAgain",
    name: "Foiled Again",
    desc: "Reach the Ink & Quill media tier",
    check: (s: GameState) => s.mediaTier >= 2,
  },
  {
    id: "oilsWell",
    name: "Oil's Well That Ends Well",
    desc: "Reach Oil Painting",
    check: (s: GameState) => s.mediaTier >= 4,
  },
  {
    id: "pixelPerfect",
    name: "Pixel Perfect",
    desc: "Reach Digital Art",
    check: (s: GameState) => s.mediaTier >= 5,
  },
  {
    id: "neuralPathways",
    name: "Neural Pathways",
    desc: "Reach Neural Art",
    check: (s: GameState) => s.mediaTier >= 6,
  },
  {
    id: "aiOverlords",
    name: "I, For One, Welcome Our AI Overlords",
    desc: "Reach AI-Generated",
    check: (s: GameState) => s.mediaTier >= 7,
  },
  {
    id: "workshopForeman",
    name: "Workshop Foreman",
    desc: "Hire at least 6 different types of artists",
    check: (s: GameState) => {
      let types = 0;
      for (const id in s.artists) {
        if ((s.artists[id] ?? 0) >= 1) types++;
      }
      return types >= 6;
    },
  },
  {
    id: "longForm",
    name: "Long-Form",
    desc: "Earn 1,000,000 Strokes in a single run without prestiging",
    check: (s: GameState) =>
      s.totalStrokes >= 1_000_000 && s.prestigeCount === 0,
  },
  {
    id: "committed",
    name: "Committed",
    desc: "Click 1,000 times",
    check: (s: GameState) => s.totalClicks >= 1_000,
  },
  {
    id: "theLongGame",
    name: "The Long Game",
    desc: "Reach the prestige threshold",
    check: (s: GameState) => s.totalStrokes >= PRESTIGE_THRESHOLD,
  },
  {
    id: "retirementPlan",
    name: "Retirement Plan",
    desc: "Accumulate 1 Trillion lifetime Strokes",
    check: (s: GameState) => s.lifetimeStrokes + s.totalStrokes >= 1_000_000_000_000,
  },
  {
    id: "studioMachine",
    name: "Studio Machine",
    desc: "Own 1,050 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_050;
    },
  },
  {
    id: "galleryEmpire",
    name: "Gallery Empire",
    desc: "Own 1,180 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_180;
    },
  },
  {
    id: "atelierLegion",
    name: "Atelier Legion",
    desc: "Own 1,275 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_275;
    },
  },
  {
    id: "productionLine",
    name: "Production Line",
    desc: "Own 1,360 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_360;
    },
  },
  {
    id: "guildNetwork",
    name: "Guild Network",
    desc: "Accumulate 500 Trillion lifetime Strokes",
    check: (s: GameState) => s.lifetimeStrokes + s.totalStrokes >= 500_000_000_000_000,
  },
  {
    id: "grandCollective",
    name: "Grand Collective",
    desc: "Own 1,400 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_400;
    },
  },
  {
    id: "legacyVault",
    name: "Legacy Vault",
    desc: "Accumulate 1.2 Quadrillion lifetime Strokes",
    check: (s: GameState) => s.lifetimeStrokes + s.totalStrokes >= 1_200_000_000_000_000,
  },
  {
    id: "atelierAssembly",
    name: "Atelier Assembly",
    desc: "Accumulate 900 Trillion lifetime Strokes",
    check: (s: GameState) => s.lifetimeStrokes + s.totalStrokes >= 900_000_000_000_000,
  },
  {
    id: "livingArchive",
    name: "Living Archive",
    desc: "Own 1,425 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_425;
    },
  },
  {
    id: "endlessStudio",
    name: "Endless Studio",
    desc: "Own 1,440 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 1_440;
    },
  },
];

export const PRESTIGE_UPGRADE_DEFS: PrestigeUpgradeDef[] = [
  {
    id: "muscleMemory",
    name: "Muscle Memory",
    desc: "+10% click power per level",
    baseCost: 1,
    maxLevel: 50,
  },
  {
    id: "artSchool",
    name: "Art School",
    desc: "+25% artist production per level",
    baseCost: 2,
    maxLevel: 50,
  },
  {
    id: "betterPaper",
    name: "Better Paper",
    desc: "Start with Charcoal media after prestige",
    baseCost: 5,
    maxLevel: 1,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    desc: "Keep unlocked sword types across prestiges",
    baseCost: 10,
    maxLevel: 1,
  },
  {
    id: "speedSketch",
    name: "Speed Sketch",
    desc: "+50% all production per level",
    baseCost: 25,
    maxLevel: 20,
  },
  {
    id: "sharpEye",
    name: "Sharp Eye",
    desc: "+5% all production per level",
    baseCost: 3,
    maxLevel: 40,
  },
  {
    id: "steadyHand",
    name: "Steady Hand",
    desc: "+5% click power per level",
    baseCost: 1,
    maxLevel: 30,
  },
  {
    id: "inkReserves",
    name: "Ink Reserves",
    desc: "Start each run at Ink & Quill (tier 2) instead of Pencil",
    baseCost: 15,
    maxLevel: 1,
  },
  {
    id: "sketchHeadStart",
    name: "Sketch Head Start",
    desc: "+1 free Doodler at the start of each run per level",
    baseCost: 3,
    maxLevel: 20,
  },
];
