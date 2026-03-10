import React, { useState, useEffect, useRef, useCallback } from 'react';
import { trackGameOpen, trackGameStart, trackGameEnd } from './analytics';
import warzoneSkyline from './assets/warzone_skyline.png';
import missileTower from './assets/missile_tower.png';
import failSoundUrl from './assets/fahhhhh.mp3';
import bgmUrl from './assets/hyperbaiter_bgm.webm';

function createSeededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}
function generateSeed() { return Math.floor(Math.random() * 2147483647); }

const NEWS_HEADLINES = [
    "BREAKING: Oil prices surge as tensions mount in the Strait",
    "UN Security Council calls emergency session amid escalation",
    "Pentagon deploys additional carrier group to Persian Gulf",
    "Tehran warns of 'decisive response' to provocations",
    "Diplomatic channels remain open despite military posturing",
    "Global shipping routes disrupted — markets in turmoil",
    "NATO allies urge restraint as situation intensifies",
    "Satellite imagery reveals new missile installations",
    "Energy stocks soar amid supply chain uncertainty",
    "IAEA inspectors request access to disputed facilities",
    "Cyber operations suspected in regional communications blackout",
    "Defense contractors report record quarterly earnings",
    "Humanitarian agencies warn of civilian impact in conflict zone",
    "Social media flooded with unverified footage from the region",
    "Swiss embassy offers to mediate between rival factions",
];

const SCORE_HEADLINES = {
    5: "⚡ ALERT: Rogue drone passes 5th sanctions barrier!",
    10: "🔥 DEVELOPING: Unidentified aircraft evades 10 missile towers!",
    15: "💥 URGENT: Drone pilot achieves legendary 15-tower streak!",
    20: "🚨 CHAOS: 20 obstacles cleared — global tension at maximum!",
    25: "☢️ DEFCON 1: Unstoppable drone reaches 25 — diplomacy has failed!",
    30: "🏆 HISTORIC: 30 obstacles — this pilot is writing history!",
};

const TRUMP_QUOTES = [
    "We have the best drones. Nobody has better drones than us!",
    "This was a TREMENDOUS failure. Sad!",
    "I would have made it through. Believe me.",
    "That was a DISASTER. Total disaster.",
    "You're fired! From the sky!",
    "We need to build a WALL around those missiles!",
    "Nobody knows more about the Strait than me.",
    "This deal was the WORST deal in history!",
    "Fake missiles! The media won't report the truth!",
    "I alone can fix the Strait of Chaos!",
    "Many people are saying this was rigged!",
    "We will make this strait GREAT again!",
];

const DIFFICULTY_LEVELS = {
    EASY: {
        label: 'Easy',
        tagline: 'Slow pull, slower pace',
        gravity: 0.115,
        maxFallVelocity: 2.6,
        flapStrength: -3.25,
        speedStart: 0.74,
        maxSpeed: 1.52,
        spawnRateStart: 236,
        minSpawnRate: 170,
        gapStart: 205,
        minGap: 165,
        speedInc: 0.19,
        spawnStep: 3,
        gapStep: 1.2,
        sanctionEvery: 6,
        missileStartScore: 6,
        missileSpawnEvery: 460,
        pirateStartScore: 12,
        pirateSpawnEvery: 460,
        powerupChance: 0.48,
    },
    MEDIUM: {
        label: 'Medium',
        tagline: 'Balanced chaos',
        gravity: 0.18,
        maxFallVelocity: 3.5,
        flapStrength: -3.8,
        speedStart: 0.8,
        maxSpeed: 1.8,
        spawnRateStart: 220,
        minSpawnRate: 140,
        gapStart: 170,
        minGap: 130,
        speedInc: 0.3,
        spawnStep: 5,
        gapStep: 2,
        sanctionEvery: 5,
        missileStartScore: 3,
        missileSpawnEvery: 380,
        pirateStartScore: 7,
        pirateSpawnEvery: 380,
        powerupChance: 0.35,
    },
    HARD: {
        label: 'Hard',
        tagline: 'Tight gaps, heavy pressure',
        gravity: 0.2,
        maxFallVelocity: 4.2,
        flapStrength: -3.95,
        speedStart: 0.92,
        maxSpeed: 2.25,
        spawnRateStart: 205,
        minSpawnRate: 120,
        gapStart: 155,
        minGap: 115,
        speedInc: 0.35,
        spawnStep: 6,
        gapStep: 2.4,
        sanctionEvery: 4,
        missileStartScore: 2,
        missileSpawnEvery: 330,
        pirateStartScore: 5,
        pirateSpawnEvery: 340,
        powerupChance: 0.28,
    },
};

const MILESTONE_UPGRADES = [
    { score: 10, name: 'Mk-II Thrusters', effect: 'Barrel roll cooldown reduced to 3s', headline: 'Drone upgraded at 10 towers: Mk-II Thrusters online' },
    { score: 20, name: 'EMP Capacitor', effect: 'EMP now charges in 4 clears', headline: '20 towers breached: EMP Capacitor installed' },
    { score: 30, name: 'Tactical AI Core', effect: 'More power-up drops and longer Peace shield', headline: '30 towers reached: Tactical AI Core activated' },
];

const RUN_MODIFIERS = {
    NONE: { label: 'Standard', desc: 'No modifier' },
    SHIELD_PLUS: { label: 'Shield+', desc: 'Longer Peace shield' },
    EMP_PLUS: { label: 'EMP+', desc: 'Lower EMP charge requirement' },
    SPEED_PLUS: { label: 'Speed+', desc: 'Longer Oil boost' },
};

const DAILY_MEDAL_TARGETS = {
    EASY: { bronze: 8, silver: 16, gold: 24 },
    MEDIUM: { bronze: 7, silver: 14, gold: 21 },
    HARD: { bronze: 6, silver: 12, gold: 18 },
};

const PATTERN_LIBRARY = {
    EASY: [
        { pattern: 'wide', minScore: 0, weight: 4.8 },
        { pattern: 'normal', minScore: 0, weight: 4.2 },
        { pattern: 'narrow', minScore: 6, weight: 1.1 },
        { pattern: 'one_sided', minScore: 9, weight: 0.8 },
        { pattern: 'moving', minScore: 15, weight: 0.4 },
        { pattern: 'staggered', minScore: 18, weight: 0.35 },
    ],
    MEDIUM: [
        { pattern: 'wide', minScore: 0, weight: 2.8 },
        { pattern: 'normal', minScore: 0, weight: 3.5 },
        { pattern: 'narrow', minScore: 2, weight: 1.8 },
        { pattern: 'one_sided', minScore: 4, weight: 1.4 },
        { pattern: 'moving', minScore: 9, weight: 1.1 },
        { pattern: 'staggered', minScore: 11, weight: 0.9 },
    ],
    HARD: [
        { pattern: 'wide', minScore: 0, weight: 1.5 },
        { pattern: 'normal', minScore: 0, weight: 2.1 },
        { pattern: 'narrow', minScore: 1, weight: 2.5 },
        { pattern: 'one_sided', minScore: 2, weight: 1.9 },
        { pattern: 'moving', minScore: 5, weight: 1.8 },
        { pattern: 'staggered', minScore: 7, weight: 1.5 },
    ],
};

const HIGH_RISK_PATTERNS = new Set(['narrow', 'moving', 'staggered']);
const RELIEF_PATTERNS = new Set(['wide', 'normal']);
const DEATH_REASON_DETAILS = {
    TOP_WALL: { label: 'Ceiling impact', tip: 'Tap slightly later to avoid over-climbing.' },
    BOTTOM_WALL: { label: 'Sea-level crash', tip: 'Use shorter taps to stay centered in the lane.' },
    TOWER_COLLISION: { label: 'Missile tower collision', tip: 'Prioritize lane alignment before speed.' },
    MISSILE_HIT: { label: 'Missile lock impact', tip: 'Bait missiles into towers or hold EMP for pressure spikes.' },
    PIRATE_COLLISION: { label: 'Pirate interception', tip: 'Treat pirates as moving towers and pre-position early.' },
    UNKNOWN: { label: 'Mission failure', tip: 'Stabilize first, then push score.' },
};

const HIGH_SCORE_STORAGE_KEY = 'straitChaosHighScoresByDifficulty';
const DAILY_SCORE_STORAGE_KEY = 'straitChaosDailyScoresByDifficulty';
const ACCESSIBILITY_STORAGE_KEY = 'straitChaosAccessibilityPrefs';
const TUTORIAL_STORAGE_KEY = 'straitChaosTutorialSeenV1';
const DEFAULT_DIFFICULTY = 'MEDIUM';
const DEFAULT_RUN_MODE = 'CLASSIC';
const TUTORIAL_TOTAL_FRAMES = 1200; // 20s at 60fps target
const TUTORIAL_STEPS = [
    { key: 'FLAP', title: 'Step 1: Tap to Fly', detail: 'Tap/click 3 times to control altitude.' },
    { key: 'ROLL', title: 'Step 2: Barrel Roll', detail: 'Press S or swipe down once.' },
    { key: 'EMP', title: 'Step 3: EMP', detail: 'Press E to fire EMP (precharged in tutorial).' },
];

function getLocalDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function hashStringToSeed(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 2147483647;
}

function getDailyMission(levelKey) {
    const normalized = parseDifficulty(levelKey) || DEFAULT_DIFFICULTY;
    const dateKey = getLocalDateKey();
    return {
        dateKey,
        seed: hashStringToSeed(`soc-daily-${dateKey}-${normalized}`),
        medals: DAILY_MEDAL_TARGETS[normalized],
    };
}

function getDailyScoreKey(dateKey, levelKey) {
    return `${dateKey}|${levelKey}`;
}

function readDailyScores() {
    try {
        const raw = localStorage.getItem(DAILY_SCORE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
        return {};
    }
}

function readAccessibilityPrefs() {
    const fallback = { reducedMotion: false, largeUI: false, highContrast: false };
    try {
        const raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return {
            reducedMotion: Boolean(parsed?.reducedMotion),
            largeUI: Boolean(parsed?.largeUI),
            highContrast: Boolean(parsed?.highContrast),
        };
    } catch {
        return fallback;
    }
}

function getMedalForScore(score, medals) {
    if (!medals) return 'None';
    if (score >= medals.gold) return 'Gold';
    if (score >= medals.silver) return 'Silver';
    if (score >= medals.bronze) return 'Bronze';
    return 'None';
}

function getDeathReportFromReason(reason) {
    return DEATH_REASON_DETAILS[reason] || DEATH_REASON_DETAILS.UNKNOWN;
}

function pickPatternForLevel(levelKey, score, randomValue, forceRelief = false) {
    const library = PATTERN_LIBRARY[levelKey] || PATTERN_LIBRARY[DEFAULT_DIFFICULTY];
    const eligible = library.filter((entry) => score >= entry.minScore && (!forceRelief || RELIEF_PATTERNS.has(entry.pattern)));
    const pool = eligible.length > 0 ? eligible : library.filter((entry) => score >= entry.minScore);
    if (pool.length === 0) return 'normal';
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = randomValue * totalWeight;
    for (const entry of pool) {
        cursor -= entry.weight;
        if (cursor <= 0) return entry.pattern;
    }
    return pool[pool.length - 1].pattern;
}

function parseDifficulty(value) {
    if (!value) return null;
    const key = String(value).toUpperCase();
    return Object.prototype.hasOwnProperty.call(DIFFICULTY_LEVELS, key) ? key : null;
}

function readDifficultyHighScores() {
    const fallback = { EASY: 0, MEDIUM: 0, HARD: 0 };
    try {
        const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return {
            EASY: Number.isFinite(parsed?.EASY) ? parsed.EASY : 0,
            MEDIUM: Number.isFinite(parsed?.MEDIUM) ? parsed.MEDIUM : 0,
            HARD: Number.isFinite(parsed?.HARD) ? parsed.HARD : 0,
        };
    } catch {
        return fallback;
    }
}

function getDifficultyProfile(levelKey) {
    return DIFFICULTY_LEVELS[levelKey] || DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY];
}

function getDifficultyHighScore(highScores, levelKey) {
    return Number.isFinite(highScores?.[levelKey]) ? highScores[levelKey] : 0;
}

function createDifficultyRuntime(levelKey) {
    const normalized = parseDifficulty(levelKey) || DEFAULT_DIFFICULTY;
    const profile = getDifficultyProfile(normalized);
    return {
        level: normalized,
        profile,
        speed: profile.speedStart,
        spawnRate: profile.spawnRateStart,
        gapSize: profile.gapStart,
        maxSpeed: profile.maxSpeed,
        minSpawnRate: profile.minSpawnRate,
        minGapSize: profile.minGap,
        speedInc: profile.speedInc,
        spawnStep: profile.spawnStep,
        gapStep: profile.gapStep,
    };
}

const StraitOfChaos = () => {
    const CONFIG = {
        BIRD_SIZE: 20,
        MISSILE_GAP_BONUS: 50,
        INTERNAL_WIDTH: 400,
        INTERNAL_HEIGHT: 700,
        PARTICLE_LIFE: 30,
        POWERUP_SIZE: 25,
        DIFFICULTY_INTERVAL: 900,
    };

    const FACTIONS = {
        USA: { name: 'USA', emoji: '🦅', color: '#3B82F6', alt: '#1E40AF' },
        IRAN: { name: 'IRAN', emoji: '🕊️', color: '#22C55E', alt: '#15803D' },
    };

    const getEscalationPhase = (s) => {
        if (s >= 25) return { name: 'FULL CHAOS', skyTop: '#1A0000', skyBot: '#4A0000', glow: '#FF0000', tint: 'rgba(255,0,0,0.25)' };
        if (s >= 15) return { name: 'CONFLICT', skyTop: '#1A0A00', skyBot: '#3D1500', glow: '#FF4400', tint: 'rgba(255,68,0,0.18)' };
        if (s >= 5) return { name: 'ESCALATION', skyTop: '#1A1000', skyBot: '#3D2800', glow: '#FF8800', tint: 'rgba(255,136,0,0.12)' };
        return { name: 'TENSE CALM', skyTop: '#0A0F1A', skyBot: '#1A2A3D', glow: '#FFaa44', tint: 'rgba(0,0,0,0)' };
    };

    const urlParams = useRef(new URLSearchParams(window.location.search));
    const challengeSeed = useRef(urlParams.current.has('seed') ? parseInt(urlParams.current.get('seed'), 10) : null);
    const challengeScore = useRef(urlParams.current.has('score') ? parseInt(urlParams.current.get('score'), 10) : null);
    const challengeDifficulty = useRef(parseDifficulty(urlParams.current.get('difficulty')));
    const challengeMode = useRef(urlParams.current.get('mode') === 'daily' ? 'DAILY' : 'CLASSIC');
    const challengeModifier = useRef(RUN_MODIFIERS[String(urlParams.current.get('modifier')).toUpperCase()] ? String(urlParams.current.get('modifier')).toUpperCase() : 'NONE');
    const isChallenge = challengeSeed.current !== null;
    const isDifficultyLocked = isChallenge && challengeDifficulty.current !== null;
    const isModeLocked = isChallenge;

    const [gameState, setGameState] = useState('START');
    const [score, setScore] = useState(0);
    const [faction, setFaction] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(challengeDifficulty.current || DEFAULT_DIFFICULTY);
    const [runMode, setRunMode] = useState(isChallenge ? challengeMode.current : DEFAULT_RUN_MODE);
    const [selectedModifier, setSelectedModifier] = useState(isChallenge ? challengeModifier.current : 'NONE');
    const [accessibility, setAccessibility] = useState(readAccessibilityPrefs);
    const [needsTutorial, setNeedsTutorial] = useState(() => localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'done');
    const [tutorialUi, setTutorialUi] = useState({ active: false, stepIndex: 0, remainingFrames: TUTORIAL_TOTAL_FRAMES, flapCount: 0 });
    const [highScores, setHighScores] = useState(readDifficultyHighScores);
    const [dailyScores, setDailyScores] = useState(readDailyScores);
    const [deathReport, setDeathReport] = useState({ label: '', tip: '' });
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirmRestart, setConfirmRestart] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [activeTab, setActiveTab] = useState('MISSION');
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const s = localStorage.getItem('straitChaosSoundOn');
        return s !== null ? s === 'true' : true;
    });

    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const frameCountRef = useRef(0);
    const currentSeedRef = useRef(isChallenge ? challengeSeed.current : generateSeed());
    const seededRandomRef = useRef(createSeededRandom(currentSeedRef.current));
    const scoreRef = useRef(0);
    const newsOffsetRef = useRef(0);
    const activeHeadlinesRef = useRef([NEWS_HEADLINES[0], NEWS_HEADLINES[1], NEWS_HEADLINES[2]]);
    const lastHeadlineIdxRef = useRef(2);
    const factionRef = useRef(null);
    const selectedDifficultyRef = useRef(challengeDifficulty.current || DEFAULT_DIFFICULTY);
    const runModeRef = useRef(isChallenge ? challengeMode.current : DEFAULT_RUN_MODE);
    const selectedModifierRef = useRef(isChallenge ? challengeModifier.current : 'NONE');
    const runMetaRef = useRef({ mode: DEFAULT_RUN_MODE, level: DEFAULT_DIFFICULTY, modifier: 'NONE', dailyDateKey: getLocalDateKey() });
    const accessibilityRef = useRef(accessibility);
    const tutorialRef = useRef({ active: false, stepIndex: 0, remainingFrames: TUTORIAL_TOTAL_FRAMES, flapCount: 0, completed: false });
    const visualRandomRef = useRef(createSeededRandom((currentSeedRef.current ^ 0x9e3779b9) >>> 0));

    const birdRef = useRef({
        y: CONFIG.INTERNAL_HEIGHT / 2, x: 100,
        velocity: 0, radius: CONFIG.BIRD_SIZE / 2,
        shieldActive: false, shieldTimer: 0, speedBoostTimer: 0, shrinkTimer: 0, sanctionSlowTimer: 0,
        propAngle: 0,
    });

    const pipesRef = useRef([]);
    const powerupsRef = useRef([]);
    const particlesRef = useRef([]);
    const touchRipplesRef = useRef([]);
    const missilesRef = useRef([]);
    const piratesRef = useRef([]);
    const trumpQuoteRef = useRef({ text: '', timer: 0 });
    const failSoundRef = useRef(null);
    const bgmRef = useRef(null);
    const soundEnabledRef = useRef(soundEnabled);
    const difficultyRef = useRef(createDifficultyRuntime(selectedDifficultyRef.current));
    const progressionRef = useRef({
        tier: 0,
        barrelCooldown: 240,
        empMaxCharge: 5,
        powerupBonus: 0,
        shieldBonusFrames: 0,
        speedBoostBonusFrames: 0,
        speedBoostMultiplier: 1.5,
    });
    const milestoneToastRef = useRef({ title: '', detail: '', timer: 0 });
    const directorRef = useRef({ pressure: 0, reliefSpawns: 0, hardPatternStreak: 0 });
    const particlePoolRef = useRef([]);
    const ripplePoolRef = useRef([]);
    const bgImageRef = useRef(null);
    const towerImageRef = useRef(null);
    // Streak & stats refs
    const streakRef = useRef(0);
    const bestStreakRef = useRef(0);
    const nearMissCountRef = useRef(0);
    const missilesDodgedRef = useRef(0);
    const comboTextRef = useRef({ text: '', timer: 0 });
    const nearMissTextRef = useRef({ timer: 0, x: 0, y: 0 });
    // Abilities
    const barrelRollRef = useRef({ active: false, timer: 0, cooldown: 0, angle: 0 });
    const empRef = useRef({ charge: 0, maxCharge: 5, blastTimer: 0, blastX: 0, blastY: 0 });
    const touchStartRef = useRef({ y: 0, time: 0 });

    const updateCanvasSize = useCallback(() => {
        const maxW = window.innerWidth, maxH = window.innerHeight;
        const aspect = CONFIG.INTERNAL_WIDTH / CONFIG.INTERNAL_HEIGHT;
        let w, h;
        if (maxW / maxH > aspect) { h = maxH; w = h * aspect; } else { w = maxW; h = w / aspect; }
        setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
    }, []);

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        trackGameOpen('Strait of Chaos');
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [updateCanvasSize]);

    useEffect(() => {
        const bg = new Image(); bg.src = warzoneSkyline; bg.onload = () => { bgImageRef.current = bg; };
        const tw = new Image(); tw.src = missileTower; tw.onload = () => { towerImageRef.current = tw; };
        failSoundRef.current = new Audio(failSoundUrl);
        failSoundRef.current.volume = 0.7;
        // Background music
        const bgm = new Audio(bgmUrl);
        bgm.loop = true; bgm.volume = 0.3;
        bgmRef.current = bgm;
    }, []);

    // Sync soundEnabled state to ref and audio elements
    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
        localStorage.setItem('straitChaosSoundOn', String(soundEnabled));
        if (bgmRef.current) bgmRef.current.muted = !soundEnabled;
        if (failSoundRef.current) failSoundRef.current.muted = !soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        accessibilityRef.current = accessibility;
        localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(accessibility));
    }, [accessibility]);

    useEffect(() => {
        if (isDifficultyLocked && challengeDifficulty.current && selectedDifficulty !== challengeDifficulty.current) {
            setSelectedDifficulty(challengeDifficulty.current);
            selectedDifficultyRef.current = challengeDifficulty.current;
        }
    }, [isDifficultyLocked, selectedDifficulty]);

    useEffect(() => {
        if (isModeLocked && runMode !== challengeMode.current) {
            setRunMode(challengeMode.current);
            runModeRef.current = challengeMode.current;
        }
        if (isModeLocked && selectedModifier !== challengeModifier.current) {
            setSelectedModifier(challengeModifier.current);
            selectedModifierRef.current = challengeModifier.current;
        }
    }, [isModeLocked, runMode, selectedModifier]);

    useEffect(() => {
        selectedDifficultyRef.current = selectedDifficulty;
    }, [selectedDifficulty]);

    useEffect(() => {
        runModeRef.current = runMode;
    }, [runMode]);

    useEffect(() => {
        selectedModifierRef.current = selectedModifier;
    }, [selectedModifier]);

    // Use deterministic random for challenge + daily runs, true randomness for classic
    const gameRandom = () => (isChallenge || runModeRef.current === 'DAILY') ? seededRandomRef.current() : Math.random();
    const gameRandomRange = (min, max) => gameRandom() * (max - min) + min;
    const visualRandom = () => (isChallenge || runModeRef.current === 'DAILY') ? visualRandomRef.current() : Math.random();

    const syncTutorialUi = () => {
        const t = tutorialRef.current;
        setTutorialUi({
            active: t.active,
            stepIndex: t.stepIndex,
            remainingFrames: t.remainingFrames,
            flapCount: t.flapCount,
        });
    };

    const createParticles = (x, y, color, count = 10) => {
        for (let i = 0; i < count; i++) {
            const particle = particlePoolRef.current.pop() || { x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' };
            particle.x = x;
            particle.y = y;
            particle.vx = (visualRandom() - 0.5) * 5;
            particle.vy = (visualRandom() - 0.5) * 5;
            particle.life = CONFIG.PARTICLE_LIFE;
            particle.color = color;
            particlesRef.current.push(particle);
        }
    };

    const resetGame = useCallback(() => {
        const levelKey = isDifficultyLocked ? challengeDifficulty.current : selectedDifficultyRef.current;
        const difficultyRuntime = createDifficultyRuntime(levelKey);
        const mode = isChallenge ? challengeMode.current : runModeRef.current;
        const dailyMission = getDailyMission(levelKey);
        const runSeed = isChallenge ? challengeSeed.current : mode === 'DAILY' ? dailyMission.seed : generateSeed();
        const modifierKey = RUN_MODIFIERS[selectedModifierRef.current] ? selectedModifierRef.current : 'NONE';
        const baseProgression = {
            tier: 0,
            barrelCooldown: 240,
            empMaxCharge: 5,
            powerupBonus: 0,
            shieldBonusFrames: 0,
            speedBoostBonusFrames: 0,
            speedBoostMultiplier: 1.5,
        };
        if (modifierKey === 'SHIELD_PLUS') baseProgression.shieldBonusFrames += 120;
        if (modifierKey === 'EMP_PLUS') baseProgression.empMaxCharge = 4;
        if (modifierKey === 'SPEED_PLUS') {
            baseProgression.speedBoostBonusFrames = 90;
            baseProgression.speedBoostMultiplier = 1.7;
        }
        currentSeedRef.current = runSeed;
        runMetaRef.current = {
            mode,
            level: levelKey,
            modifier: modifierKey,
            dailyDateKey: dailyMission.dateKey,
        };
        seededRandomRef.current = createSeededRandom(currentSeedRef.current);
        visualRandomRef.current = createSeededRandom((currentSeedRef.current ^ 0x9e3779b9) >>> 0);
        scoreRef.current = 0;
        birdRef.current = {
            y: CONFIG.INTERNAL_HEIGHT / 2, x: 100,
            velocity: 0, radius: CONFIG.BIRD_SIZE / 2,
            shieldActive: false, shieldTimer: 0, speedBoostTimer: 0, shrinkTimer: 0, sanctionSlowTimer: 0, propAngle: 0,
        };
        for (const p of particlesRef.current) particlePoolRef.current.push(p);
        for (const r of touchRipplesRef.current) ripplePoolRef.current.push(r);
        pipesRef.current = []; powerupsRef.current = []; particlesRef.current = [];
        touchRipplesRef.current = []; missilesRef.current = []; piratesRef.current = [];
        trumpQuoteRef.current = { text: '', timer: 0 };
        frameCountRef.current = 0;
        difficultyRef.current = difficultyRuntime;
        progressionRef.current = baseProgression;
        milestoneToastRef.current = { title: '', detail: '', timer: 0 };
        directorRef.current = { pressure: 0, reliefSpawns: 0, hardPatternStreak: 0 };
        tutorialRef.current = { active: false, stepIndex: 0, remainingFrames: TUTORIAL_TOTAL_FRAMES, flapCount: 0, completed: false };
        newsOffsetRef.current = 0;
        activeHeadlinesRef.current = [NEWS_HEADLINES[0], NEWS_HEADLINES[1], NEWS_HEADLINES[2]];
        lastHeadlineIdxRef.current = 2;
        // Reset stats
        streakRef.current = 0; bestStreakRef.current = 0;
        nearMissCountRef.current = 0; missilesDodgedRef.current = 0;
        comboTextRef.current = { text: '', timer: 0 };
        nearMissTextRef.current = { timer: 0, x: 0, y: 0 };
        barrelRollRef.current = { active: false, timer: 0, cooldown: 0, angle: 0 };
        empRef.current = { charge: 0, maxCharge: progressionRef.current.empMaxCharge, blastTimer: 0, blastX: 0, blastY: 0 };
        setConfirmRestart(false);
        setTutorialUi({ active: false, stepIndex: 0, remainingFrames: TUTORIAL_TOTAL_FRAMES, flapCount: 0 });
        setDeathReport({ label: '', tip: '' });
        setScore(0); setShowShareModal(false); setCopied(false); setGameState('START');
    }, [isChallenge, isDifficultyLocked]);

    const startGame = useCallback(() => {
        if (!factionRef.current) return;
        resetGame();
        if (!isChallenge && needsTutorial) {
            tutorialRef.current = { active: true, stepIndex: 0, remainingFrames: TUTORIAL_TOTAL_FRAMES, flapCount: 0, completed: false };
            syncTutorialUi();
        }
        // Start background music
        if (bgmRef.current) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.volume = 0.24;
            bgmRef.current.playbackRate = 1;
            bgmRef.current.play().catch(() => { });
        }
        trackGameStart('Strait of Chaos');
        setGameState('PLAYING');
    }, [isChallenge, needsTutorial, resetGame]);

    const pauseGame = useCallback(() => {
        setConfirmRestart(false);
        setGameState('PAUSED');
        if (bgmRef.current) bgmRef.current.pause();
    }, []);

    const resumeGame = useCallback(() => {
        setGameState('PLAYING');
        if (bgmRef.current && soundEnabledRef.current) bgmRef.current.play().catch(() => { });
    }, []);

    const requestRestart = useCallback(() => {
        setConfirmRestart(true);
    }, []);

    const cancelRestart = useCallback(() => {
        setConfirmRestart(false);
    }, []);

    const confirmRestartRun = useCallback(() => {
        setConfirmRestart(false);
        startGame();
    }, [startGame]);

    const quitToBriefing = useCallback(() => {
        setConfirmRestart(false);
        resetGame();
    }, [resetGame]);

    const completeTutorial = useCallback(() => {
        tutorialRef.current.active = false;
        tutorialRef.current.completed = true;
        syncTutorialUi();
        setNeedsTutorial(false);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
        milestoneToastRef.current = { title: 'TUTORIAL COMPLETE', detail: 'You are combat-ready. Good luck, pilot.', timer: 150 };
    }, []);

    const flap = useCallback(() => {
        const bird = birdRef.current;
        const f = factionRef.current || FACTIONS.USA;
        bird.velocity = difficultyRef.current.profile.flapStrength;
        createParticles(bird.x, bird.y, f.color, 5);
        const t = tutorialRef.current;
        if (t.active && t.stepIndex === 0) {
            t.flapCount = Math.min(3, t.flapCount + 1);
            if (t.flapCount >= 3) {
                t.stepIndex = 1;
            }
            syncTutorialUi();
        }
    }, []);

    const triggerBarrelRoll = useCallback(() => {
        const br = barrelRollRef.current;
        if (br.cooldown > 0 || br.active) return;
        br.active = true;
        br.timer = 24; // ~0.4 seconds at 60fps
        br.cooldown = progressionRef.current.barrelCooldown;
        br.angle = 0;
        createParticles(birdRef.current.x, birdRef.current.y, '#00FFFF', 10);
        const t = tutorialRef.current;
        if (t.active && t.stepIndex === 1) {
            t.stepIndex = 2;
            empRef.current.charge = empRef.current.maxCharge;
            syncTutorialUi();
        }
    }, []);

    const triggerEMP = useCallback(() => {
        const emp = empRef.current;
        if (emp.charge < emp.maxCharge) return;
        emp.charge = 0;
        emp.blastTimer = 30;
        emp.blastX = birdRef.current.x;
        emp.blastY = birdRef.current.y;
        // Destroy all missiles
        missilesRef.current.forEach(m => {
            createParticles(m.x, m.y, '#00FFFF', 15);
            createParticles(m.x, m.y, '#FF4400', 8);
            missilesDodgedRef.current++;
        });
        missilesRef.current = [];
        createParticles(birdRef.current.x, birdRef.current.y, '#00FFFF', 25);
        const t = tutorialRef.current;
        if (t.active && t.stepIndex === 2) {
            completeTutorial();
        }
    }, [completeTutorial]);

    const addTouchRipple = (cx, cy) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ripple = ripplePoolRef.current.pop() || { x: 0, y: 0, radius: 0, maxRadius: 40, life: 0 };
        ripple.x = (cx - rect.left) * (CONFIG.INTERNAL_WIDTH / rect.width);
        ripple.y = (cy - rect.top) * (CONFIG.INTERNAL_HEIGHT / rect.height);
        ripple.radius = 0;
        ripple.maxRadius = 40;
        ripple.life = 20;
        touchRipplesRef.current.push(ripple);
    };

    const POWERUP_TYPES = {
        OIL: { color: '#F59E0B', char: '🛢️', label: 'Oil Barrel' },
        PEACE: { color: '#FFFFFF', char: '🏳️', label: 'Peace Treaty' },
        UN: { color: '#3B82F6', char: '🇺🇳', label: 'UN Resolution' },
    };

    const activatePowerup = (type) => {
        if (type === 'PEACE') { birdRef.current.shieldActive = true; birdRef.current.shieldTimer = 300 + progressionRef.current.shieldBonusFrames; }
        if (type === 'OIL') birdRef.current.speedBoostTimer = 180 + progressionRef.current.speedBoostBonusFrames;
        if (type === 'UN') birdRef.current.shrinkTimer = 300;
    };

    const gameOver = useCallback((reason = 'UNKNOWN') => {
        if (tutorialRef.current.active) {
            tutorialRef.current.active = false;
            syncTutorialUi();
        }
        setGameState('GAMEOVER');
        const fs = scoreRef.current;
        const levelKey = difficultyRef.current.level || selectedDifficultyRef.current;
        const death = getDeathReportFromReason(reason);
        setScore(fs);
        setDeathReport(death);
        trackGameEnd('Strait of Chaos', fs);
        setHighScores(prev => {
            const currentBest = getDifficultyHighScore(prev, levelKey);
            if (fs <= currentBest) return prev;
            const next = { ...prev, [levelKey]: fs };
            localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
        if (!isChallenge && runMetaRef.current.mode === 'DAILY') {
            const dailyKey = getDailyScoreKey(runMetaRef.current.dailyDateKey, levelKey);
            setDailyScores(prev => {
                const currentBest = Number.isFinite(prev?.[dailyKey]) ? prev[dailyKey] : 0;
                if (fs <= currentBest) return prev;
                const next = { ...prev, [dailyKey]: fs };
                localStorage.setItem(DAILY_SCORE_STORAGE_KEY, JSON.stringify(next));
                return next;
            });
        }
        // Save best streak
        if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
        // Lower music volume
        if (bgmRef.current) bgmRef.current.volume = 0.08;
        // Play failure sound
        if (failSoundRef.current) {
            failSoundRef.current.currentTime = 0;
            failSoundRef.current.play().catch(() => { });
        }
        // Show Trump quote
        trumpQuoteRef.current = {
            text: TRUMP_QUOTES[Math.floor(visualRandom() * TRUMP_QUOTES.length)],
            timer: 180,
        };
    }, [isChallenge]);

    const applyMilestoneUpgrades = useCallback(() => {
        const targetTier = Math.min(MILESTONE_UPGRADES.length, Math.floor(scoreRef.current / 10));
        if (targetTier <= progressionRef.current.tier) return;

        for (let tier = progressionRef.current.tier + 1; tier <= targetTier; tier++) {
            if (tier >= 1) progressionRef.current.barrelCooldown = 180;
            if (tier >= 2) {
                progressionRef.current.empMaxCharge = 4;
                if (empRef.current.charge > 4) empRef.current.charge = 4;
            }
            if (tier >= 3) {
                progressionRef.current.powerupBonus = 0.12;
                progressionRef.current.shieldBonusFrames = 60;
            }

            empRef.current.maxCharge = progressionRef.current.empMaxCharge;

            const upgrade = MILESTONE_UPGRADES[tier - 1];
            milestoneToastRef.current = {
                title: `UPGRADE UNLOCKED: ${upgrade.name}`,
                detail: upgrade.effect,
                timer: 150,
            };
            activeHeadlinesRef.current.push(`🛠️ ${upgrade.headline}`);
        }

        progressionRef.current.tier = targetTier;
    }, []);

    // --- UPDATE ---
    const update = useCallback(() => {
        frameCountRef.current++;
        applyMilestoneUpgrades();
        const tutorial = tutorialRef.current;
        if (tutorial.active) {
            tutorial.remainingFrames = Math.max(0, tutorial.remainingFrames - 1);
            if (tutorial.stepIndex === 2 && empRef.current.charge < empRef.current.maxCharge) {
                empRef.current.charge = empRef.current.maxCharge;
            }
            if (frameCountRef.current % 10 === 0) syncTutorialUi();
            if (tutorial.remainingFrames <= 0) {
                completeTutorial();
            }
        }
        const bird = birdRef.current;
        const difficulty = difficultyRef.current;
        const profile = difficulty.profile;
        const accessibilityPrefs = accessibilityRef.current;

        if (!tutorial.active && frameCountRef.current % CONFIG.DIFFICULTY_INTERVAL === 0) {
            difficulty.speed = Math.min(difficulty.speed + difficulty.speedInc, difficulty.maxSpeed);
            difficulty.spawnRate = Math.max(difficulty.spawnRate - difficulty.spawnStep, difficulty.minSpawnRate);
            difficulty.gapSize = Math.max(difficulty.gapSize - difficulty.gapStep, difficulty.minGapSize);
        }

        let currentSpeed = bird.speedBoostTimer > 0 ? difficulty.speed * progressionRef.current.speedBoostMultiplier : difficulty.speed;
        if (tutorial.active) currentSpeed *= 0.78;
        if (bird.sanctionSlowTimer > 0) { currentSpeed *= 0.5; bird.sanctionSlowTimer--; }

        bird.velocity += profile.gravity;
        if (Number.isFinite(profile.maxFallVelocity)) {
            bird.velocity = Math.min(bird.velocity, profile.maxFallVelocity);
        }
        if (tutorial.active) bird.velocity *= 0.96;
        bird.y += bird.velocity;
        bird.propAngle += 0.3;

        // Barrel roll timer
        const br = barrelRollRef.current;
        if (br.active) { br.timer--; br.angle += Math.PI / 6; if (br.timer <= 0) br.active = false; }
        if (br.cooldown > 0) br.cooldown--;
        const isInvincible = br.active;

        const hitTop = bird.y - bird.radius < 0;
        const hitBottom = bird.y + bird.radius > CONFIG.INTERNAL_HEIGHT;
        if (hitTop || hitBottom) {
            if (isInvincible) {
                bird.velocity *= -0.5;
                bird.y = hitTop ? bird.radius + 1 : CONFIG.INTERNAL_HEIGHT - bird.radius - 1;
            } else if (bird.shieldActive) {
                bird.shieldActive = false; bird.velocity *= -0.5;
                bird.y = hitTop ? bird.radius + 1 : CONFIG.INTERNAL_HEIGHT - bird.radius - 1;
                createParticles(bird.x, bird.y, '#FFFFFF', 15);
            } else { gameOver(hitTop ? 'TOP_WALL' : 'BOTTOM_WALL'); return; }
        }

        if (bird.speedBoostTimer > 0) bird.speedBoostTimer--;
        if (bird.shrinkTimer > 0) { bird.shrinkTimer--; bird.radius = (CONFIG.BIRD_SIZE / 2) * 0.6; }
        else bird.radius = CONFIG.BIRD_SIZE / 2;
        // Shield timer countdown
        if (bird.shieldActive && bird.shieldTimer > 0) {
            bird.shieldTimer--;
            if (bird.shieldTimer <= 0) bird.shieldActive = false;
        }

        // Spawn pipes — randomized patterns
        if (frameCountRef.current % Math.round(difficulty.spawnRate) === 0) {
            const director = directorRef.current;
            const missileGapBonus = missilesRef.current.length > 0 ? CONFIG.MISSILE_GAP_BONUS : 0;
            const gap = difficulty.gapSize + missileGapBonus;
            const topH = gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - gap - 50);
            const pipeCount = pipesRef.current.filter(p => p.passed).length + pipesRef.current.length;
            const isSanction = (pipeCount + 1) % profile.sanctionEvery === 0;
            const sc = scoreRef.current;
            const threatLoad = (missilesRef.current.length > 0 ? 1 : 0) + (piratesRef.current.length > 0 ? 1 : 0) + (missilesRef.current.length > 2 ? 1 : 0);
            director.pressure = Math.max(0, director.pressure - 0.04 + threatLoad * 0.12 + (difficulty.speed > profile.speedStart + 0.35 ? 0.05 : 0));
            const forceRelief = director.reliefSpawns > 0 || director.pressure > 1.05;
            let pattern = tutorial.active ? ((pipeCount + frameCountRef.current) % 2 === 0 ? 'wide' : 'normal') : pickPatternForLevel(difficulty.level, sc, gameRandom(), forceRelief);
            if (threatLoad >= 2 && HIGH_RISK_PATTERNS.has(pattern)) pattern = 'normal';
            if (pattern === 'staggered' && forceRelief) pattern = 'normal';
            if (HIGH_RISK_PATTERNS.has(pattern)) director.hardPatternStreak++;
            else director.hardPatternStreak = 0;
            if (director.hardPatternStreak >= 3) {
                director.reliefSpawns = Math.max(director.reliefSpawns, 2);
                director.hardPatternStreak = 0;
            }
            if (forceRelief && director.reliefSpawns > 0) director.reliefSpawns--;

            const fairGapBonus = (forceRelief ? 18 : 0) + (threatLoad >= 2 ? 8 : 0) + (tutorial.active ? 22 : 0);
            const pipeW = pattern === 'narrow' ? 35 : pattern === 'wide' ? 70 : 50;
            const pipeGap = (pattern === 'narrow' ? gap + 20 : gap) + fairGapBonus;
            const adjTopH = pattern === 'narrow' ? gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - pipeGap - 50) : topH;
            const adjBottomY = adjTopH + pipeGap;

            // One-sided: only top or bottom
            const oneSide = pattern === 'one_sided' ? (gameRandom() > 0.5 ? 'top' : 'bottom') : null;

            pipesRef.current.push({
                x: CONFIG.INTERNAL_WIDTH, topHeight: oneSide === 'bottom' ? 0 : adjTopH,
                bottomY: oneSide === 'top' ? CONFIG.INTERNAL_HEIGHT : adjBottomY,
                width: pipeW, passed: false, isSanction, pattern,
                movingDir: pattern === 'moving' ? (gameRandom() > 0.5 ? 1 : -1) : 0,
                movingSpeed: pattern === 'moving' ? 0.3 + gameRandom() * 0.3 : 0,
                oneSide,
            });

            // Staggered double: add a second pipe nearby with offset gap
            if (pattern === 'staggered') {
                const topH2 = gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - pipeGap - 50);
                pipesRef.current.push({
                    x: CONFIG.INTERNAL_WIDTH + 80, topHeight: topH2, bottomY: topH2 + pipeGap,
                    width: 50, passed: false, isSanction: false, pattern: 'normal',
                    movingDir: 0, movingSpeed: 0, oneSide: null,
                });
            }

            const powerupChance = Math.min(0.85, profile.powerupChance + progressionRef.current.powerupBonus + (forceRelief ? 0.08 : 0) + (tutorial.active ? 0.12 : 0));
            if (gameRandom() < powerupChance) {
                const types = ['PEACE', 'OIL', 'UN'];
                const type = types[Math.floor(gameRandom() * types.length)];
                const py = adjTopH + pipeGap / 2;
                powerupsRef.current.push({ x: CONFIG.INTERNAL_WIDTH + 30, y: py, type, active: true, baseY: py, offset: gameRandom() * Math.PI * 2 });
            }
        }

        // Update pipes
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
            const pipe = pipesRef.current[i];
            pipe.x -= currentSpeed;

            // Moving gap: shift topHeight/bottomY
            if (pipe.movingDir !== 0) {
                const gapSize = pipe.bottomY - pipe.topHeight;
                pipe.topHeight += pipe.movingSpeed * pipe.movingDir;
                pipe.bottomY = pipe.topHeight + gapSize;
                if (pipe.topHeight < 30 || pipe.bottomY > CONFIG.INTERNAL_HEIGHT - 30) {
                    pipe.movingDir *= -1;
                }
            }

            const bL = bird.x - bird.radius, bR = bird.x + bird.radius, bT = bird.y - bird.radius, bB = bird.y + bird.radius;
            const pL = pipe.x, pR = pipe.x + pipe.width;
            const hitT = pipe.topHeight > 0 && bR > pL && bL < pR && bT < pipe.topHeight;
            const hitB = pipe.bottomY < CONFIG.INTERNAL_HEIGHT && bR > pL && bL < pR && bB > pipe.bottomY;

            if (hitT || hitB) {
                if (isInvincible) {
                    // Barrel roll: phase through
                    createParticles(bird.x, bird.y, '#00FFFF', 5);
                } else if (pipe.isSanction) {
                    bird.sanctionSlowTimer = 90;
                    createParticles(bird.x, bird.y, '#F59E0B', 8);
                    pipesRef.current.splice(i, 1);
                    directorRef.current.reliefSpawns = Math.max(directorRef.current.reliefSpawns, 1);
                    directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.25);
                    if (!pipe.passed) { pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current); }
                    streakRef.current = Math.max(0, streakRef.current - 1);
                    if (SCORE_HEADLINES[scoreRef.current]) {
                        activeHeadlinesRef.current.push(SCORE_HEADLINES[scoreRef.current]);
                    }
                    continue;
                } else if (bird.shieldActive) {
                    // Shield BREAKS through walls without being consumed!
                    pipesRef.current.splice(i, 1);
                    createParticles(bird.x, bird.y, '#FFFFFF', 20);
                    createParticles(pipe.x + pipe.width / 2, bird.y, '#FF6600', 12);
                    // Score it as passed
                    if (!pipe.passed) { pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current); }
                    continue;
                } else {
                    gameOver('TOWER_COLLISION'); return;
                }
            }

            if (!pipe.passed && bL > pR) {
                pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current);
                directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.07);
                // Streak
                streakRef.current++;
                if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
                if (streakRef.current >= 15) comboTextRef.current = { text: `${streakRef.current}x UNSTOPPABLE! 💀🔥`, timer: 60 };
                else if (streakRef.current >= 10) comboTextRef.current = { text: `${streakRef.current}x ON FIRE! 🔥🔥`, timer: 50 };
                else if (streakRef.current >= 5) comboTextRef.current = { text: `${streakRef.current}x STREAK 🔥`, timer: 40 };
                if (SCORE_HEADLINES[scoreRef.current]) activeHeadlinesRef.current.push(SCORE_HEADLINES[scoreRef.current]);
                // EMP charge
                if (empRef.current.charge < empRef.current.maxCharge) empRef.current.charge++;
                // Near-miss detection (within 8px of pipe edge)
                const nearTop = pipe.topHeight > 0 && Math.abs(bT - pipe.topHeight) < 8;
                const nearBot = pipe.bottomY < CONFIG.INTERNAL_HEIGHT && Math.abs(bB - pipe.bottomY) < 8;
                if (nearTop || nearBot) {
                    nearMissCountRef.current++;
                    nearMissTextRef.current = { timer: 40, x: bird.x, y: bird.y - 25 };
                    createParticles(bird.x, bird.y, '#FFD700', 12);
                }
            }
            if (pipe.x + pipe.width < 0) pipesRef.current.splice(i, 1);
        }

        // Power-ups
        for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
            const p = powerupsRef.current[i]; p.x -= currentSpeed;
            p.y = p.baseY + Math.sin(frameCountRef.current * 0.1 + p.offset) * 5;
            const d = Math.sqrt((bird.x - p.x) ** 2 + (bird.y - p.y) ** 2);
            if (p.active && d < bird.radius + CONFIG.POWERUP_SIZE / 2) {
                p.active = false; activatePowerup(p.type);
                createParticles(p.x, p.y, POWERUP_TYPES[p.type].color, 10);
                powerupsRef.current.splice(i, 1);
            }
            if (p.x < -50) powerupsRef.current.splice(i, 1);
        }

        // Particles & ripples
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i]; p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) {
                const [recycled] = particlesRef.current.splice(i, 1);
                particlePoolRef.current.push(recycled);
            }
        }
        for (let i = touchRipplesRef.current.length - 1; i >= 0; i--) {
            const r = touchRipplesRef.current[i]; r.radius += 2; r.life--;
            if (r.life <= 0) {
                const [recycled] = touchRipplesRef.current.splice(i, 1);
                ripplePoolRef.current.push(recycled);
            }
        }

        // News ticker scroll
        newsOffsetRef.current += 0.8;

        // Spawn homing missiles (after score 3, every ~400 frames, with warning)
        if (!tutorial.active && scoreRef.current >= profile.missileStartScore && frameCountRef.current % profile.missileSpawnEvery === 0) {
            const side = gameRandom() > 0.5 ? 'right' : 'top';
            missilesRef.current.push({
                x: side === 'right' ? CONFIG.INTERNAL_WIDTH + 20 : gameRandomRange(100, CONFIG.INTERNAL_WIDTH - 50),
                y: side === 'top' ? -20 : gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - 50),
                vx: 0, vy: 0, speed: 1.0 + scoreRef.current * 0.04,
                life: 300, age: 0, trackingLife: 120, // stops homing after 120 frames (~2 sec)
                trail: [], warning: 60, // 60 frames of warning before active
            });
            directorRef.current.pressure += 0.18;
            if (missilesRef.current.length >= 3) directorRef.current.reliefSpawns = Math.max(directorRef.current.reliefSpawns, 1);
        }

        // Update missiles (homing with burnout + pipe collision)
        for (let i = missilesRef.current.length - 1; i >= 0; i--) {
            const m = missilesRef.current[i];

            // Warning phase — missile blinks but doesn't move yet
            if (m.warning > 0) { m.warning--; continue; }

            m.age++;
            const dx = bird.x - m.x, dy = bird.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Homing phase: only tracks for first `trackingLife` frames, then flies straight
            if (m.age <= m.trackingLife) {
                const turnRate = 0.04; // weaker turning = wider arc = dodgeable
                const ax = (dx / dist) * m.speed * turnRate;
                const ay = (dy / dist) * m.speed * turnRate;
                m.vx += ax; m.vy += ay;
            }
            // After burnout, missile keeps its last direction (no more tracking)

            const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            if (spd > m.speed) { m.vx = (m.vx / spd) * m.speed; m.vy = (m.vy / spd) * m.speed; }
            // Accelerate slightly after burnout for drama
            if (m.age > m.trackingLife) { m.vx *= 1.005; m.vy *= 1.005; }

            m.x += m.vx; m.y += m.vy; m.life--;
            m.trail.push({ x: m.x, y: m.y, life: 15 });
            if (m.trail.length > 14) m.trail.shift();
            m.trail.forEach(t => t.life--);

            // Collision with bird
            if (dist < bird.radius + 8) {
                if (isInvincible) {
                    // Barrel roll: dodge missile
                    createParticles(m.x, m.y, '#00FFFF', 12);
                    missilesDodgedRef.current++;
                    directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.1);
                    missilesRef.current.splice(i, 1); continue;
                } else if (bird.shieldActive) {
                    // Shield BREAKS through missiles without being consumed!
                    createParticles(m.x, m.y, '#FF4444', 15);
                    createParticles(m.x, m.y, '#FFFFFF', 8);
                    directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.1);
                    missilesRef.current.splice(i, 1); continue;
                } else { gameOver('MISSILE_HIT'); return; }
            }

            // Missile crashes into pipes! (gives player a way to trick missiles)
            let hitPipe = false;
            for (const pipe of pipesRef.current) {
                if (m.x > pipe.x && m.x < pipe.x + pipe.width) {
                    if (m.y < pipe.topHeight || m.y > pipe.bottomY) {
                        hitPipe = true; break;
                    }
                }
            }
            if (hitPipe) {
                createParticles(m.x, m.y, '#FF6600', 20);
                createParticles(m.x, m.y, '#FFAA00', 10);
                missilesDodgedRef.current++;
                directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.08);
                missilesRef.current.splice(i, 1); continue;
            }

            if (m.life <= 0 || m.x < -50 || m.x > CONFIG.INTERNAL_WIDTH + 50 || m.y < -50 || m.y > CONFIG.INTERNAL_HEIGHT + 50) {
                createParticles(m.x, m.y, '#FF6600', 8);
                missilesDodgedRef.current++;
                directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.05);
                missilesRef.current.splice(i, 1);
            }
        }

        // Spawn pirates (after score 7, every ~400 frames)
        if (!tutorial.active && scoreRef.current >= profile.pirateStartScore && frameCountRef.current % profile.pirateSpawnEvery === 0) {
            piratesRef.current.push({
                x: CONFIG.INTERNAL_WIDTH + 40,
                y: gameRandomRange(80, CONFIG.INTERNAL_HEIGHT - 80),
                baseY: 0, speed: 0.6 + gameRandom() * 0.4,
                bobOffset: gameRandom() * Math.PI * 2,
                width: 50, height: 30,
            });
            piratesRef.current[piratesRef.current.length - 1].baseY = piratesRef.current[piratesRef.current.length - 1].y;
            directorRef.current.pressure += 0.14;
            if (piratesRef.current.length >= 2) directorRef.current.reliefSpawns = Math.max(directorRef.current.reliefSpawns, 1);
        }

        // Update pirates
        for (let i = piratesRef.current.length - 1; i >= 0; i--) {
            const p = piratesRef.current[i];
            p.x -= p.speed;
            p.y = p.baseY + Math.sin(frameCountRef.current * 0.03 + p.bobOffset) * 25;
            // Collision
            const dx = bird.x - p.x, dy = bird.y - p.y;
            if (Math.abs(dx) < p.width / 2 + bird.radius && Math.abs(dy) < p.height / 2 + bird.radius) {
                if (isInvincible) {
                    createParticles(p.x, p.y, '#00FFFF', 10);
                    directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.08);
                    piratesRef.current.splice(i, 1); continue;
                } else if (bird.shieldActive) {
                    // Shield BREAKS through pirates without being consumed!
                    createParticles(p.x, p.y, '#8B4513', 15);
                    createParticles(p.x, p.y, '#FFFFFF', 8);
                    directorRef.current.pressure = Math.max(0, directorRef.current.pressure - 0.08);
                    piratesRef.current.splice(i, 1); continue;
                } else { gameOver('PIRATE_COLLISION'); return; }
            }
            if (p.x < -60) piratesRef.current.splice(i, 1);
        }

        // Trump quote timer
        if (trumpQuoteRef.current.timer > 0) trumpQuoteRef.current.timer--;
        // Combo & near-miss timers
        if (comboTextRef.current.timer > 0) comboTextRef.current.timer--;
        if (nearMissTextRef.current.timer > 0) nearMissTextRef.current.timer--;
        // EMP blast timer
        if (empRef.current.blastTimer > 0) empRef.current.blastTimer--;
        if (milestoneToastRef.current.timer > 0) milestoneToastRef.current.timer--;
        // Dynamic BGM intensity by score phase
        if (bgmRef.current) {
            const phaseTier = scoreRef.current >= 25 ? 3 : scoreRef.current >= 15 ? 2 : scoreRef.current >= 6 ? 1 : 0;
            const volumeTargets = accessibilityPrefs.reducedMotion ? [0.2, 0.24, 0.28, 0.32] : [0.22, 0.28, 0.34, 0.4];
            const rateTargets = accessibilityPrefs.reducedMotion ? [1, 1.01, 1.02, 1.03] : [1, 1.03, 1.07, 1.11];
            const targetVol = volumeTargets[phaseTier];
            const targetRate = rateTargets[phaseTier];
            bgmRef.current.volume += (targetVol - bgmRef.current.volume) * 0.06;
            bgmRef.current.playbackRate += (targetRate - bgmRef.current.playbackRate) * 0.06;
        }
    }, [applyMilestoneUpgrades, completeTutorial, gameOver]);

    // --- DRAW ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = CONFIG.INTERNAL_WIDTH, H = CONFIG.INTERNAL_HEIGHT;
        const phase = getEscalationPhase(scoreRef.current);
        const f = factionRef.current || FACTIONS.USA;
        const accessibilityPrefs = accessibilityRef.current;
        const dangerColor = accessibilityPrefs.highContrast ? '#FFFFFF' : '#EF4444';

        // Background
        if (bgImageRef.current) {
            const scale = H / bgImageRef.current.height;
            const sw = bgImageRef.current.width * scale;
            const scrollX = (frameCountRef.current * 0.5) % sw;
            for (let i = 0; i <= Math.ceil(W / sw) + 1; i++) {
                ctx.drawImage(bgImageRef.current, i * sw - scrollX, 0, sw, H);
            }
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, phase.skyTop); g.addColorStop(1, phase.skyBot);
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }

        // Escalation tint overlay
        ctx.fillStyle = phase.tint; ctx.fillRect(0, 0, W, H);

        // Pipes / Missile Towers
        pipesRef.current.forEach(pipe => {
            if (pipe.isSanction) {
                // Golden sanctions barrier
                ctx.shadowBlur = 12; ctx.shadowColor = '#F59E0B';
                const grd = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
                grd.addColorStop(0, '#92400E'); grd.addColorStop(0.5, '#F59E0B'); grd.addColorStop(1, '#92400E');
                ctx.fillStyle = grd;
                ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
                ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, H - pipe.bottomY);
                // $ signs
                ctx.fillStyle = '#000'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
                ctx.fillText('$$$', pipe.x + pipe.width / 2, pipe.topHeight - 15);
                ctx.fillText('$$$', pipe.x + pipe.width / 2, pipe.bottomY + 25);
                ctx.shadowBlur = 0;
            } else if (towerImageRef.current) {
                const pat = ctx.createPattern(towerImageRef.current, 'repeat');
                ctx.save(); ctx.translate(pipe.x, 0);
                ctx.fillStyle = pat; ctx.fillRect(0, 0, pipe.width, pipe.topHeight);
                ctx.fillStyle = '#111'; ctx.fillRect(0, pipe.topHeight - 8, pipe.width, 8);
                ctx.strokeStyle = dangerColor; ctx.lineWidth = accessibilityPrefs.highContrast ? 2.5 : 2;
                ctx.strokeRect(0, 0, pipe.width, pipe.topHeight); ctx.restore();
                ctx.save(); ctx.translate(pipe.x, pipe.bottomY);
                ctx.fillStyle = pat; ctx.fillRect(0, 0, pipe.width, H - pipe.bottomY);
                ctx.fillStyle = '#111'; ctx.fillRect(0, 0, pipe.width, 8);
                ctx.strokeStyle = dangerColor; ctx.lineWidth = accessibilityPrefs.highContrast ? 2.5 : 2;
                ctx.strokeRect(0, 0, pipe.width, H - pipe.bottomY); ctx.restore();
            } else {
                ctx.shadowBlur = accessibilityPrefs.reducedMotion ? 0 : 10; ctx.shadowColor = dangerColor;
                ctx.strokeStyle = dangerColor; ctx.lineWidth = accessibilityPrefs.highContrast ? 4 : 3; ctx.fillStyle = '#1A1A1A';
                ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
                ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
                ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, H - pipe.bottomY);
                ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, H - pipe.bottomY);
                ctx.shadowBlur = 0;
            }
        });

        // Power-ups
        powerupsRef.current.forEach(p => {
            if (!p.active) return;
            const pw = POWERUP_TYPES[p.type];
            ctx.shadowBlur = 15; ctx.shadowColor = pw.color;
            ctx.fillStyle = pw.color; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
            ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(pw.char, p.x, p.y);
            ctx.shadowBlur = 0;
        });

        // Particles
        particlesRef.current.forEach(p => {
            ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        });

        // Touch Ripples
        touchRipplesRef.current.forEach(r => {
            ctx.globalAlpha = r.life / 20; ctx.strokeStyle = f.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        });

        // Drone (bird)
        const bird = birdRef.current;
        const droneScale = bird.radius / 10;
        ctx.save(); ctx.translate(bird.x, bird.y);
        // Tilt based on velocity
        const tilt = accessibilityPrefs.reducedMotion ? 0 : Math.max(-0.3, Math.min(0.3, bird.velocity * 0.05));
        ctx.rotate(tilt);
        // Barrel roll spin
        const brDraw = barrelRollRef.current;
        if (brDraw.active) {
            ctx.rotate(brDraw.angle);
            // Cyan glow during roll
            ctx.shadowBlur = 25; ctx.shadowColor = '#00FFFF';
            ctx.globalAlpha = 0.7 + Math.sin(frameCountRef.current * 0.8) * 0.3;
        }

        // Shield bubble
        if (bird.shieldActive) {
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
            ctx.arc(0, 0, bird.radius + 12 + Math.sin(frameCountRef.current * 0.2) * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
        }

        // Sanction slow effect
        if (bird.sanctionSlowTimer > 0) {
            ctx.beginPath(); ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
            ctx.arc(0, 0, bird.radius + 16, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }

        // --- DETAILED DRONE ---
        const s = droneScale;
        ctx.shadowBlur = 15; ctx.shadowColor = f.color;

        // Main body (center fuselage)
        ctx.fillStyle = '#2A2A3E';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = f.color; ctx.lineWidth = 1; ctx.stroke();

        // Arms (4 diagonal arms extending outward)
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5 * s;
        const armLen = 14 * s;
        const armPositions = [
            [-armLen, -armLen * 0.7], [armLen, -armLen * 0.7],
            [-armLen, armLen * 0.7], [armLen, armLen * 0.7],
        ];
        armPositions.forEach(([ax, ay]) => {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax, ay); ctx.stroke();
        });

        // Motor housings (circles at arm ends)
        armPositions.forEach(([ax, ay]) => {
            ctx.fillStyle = '#1A1A2E';
            ctx.beginPath(); ctx.arc(ax, ay, 4 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = f.alt; ctx.lineWidth = 1; ctx.stroke();
        });

        // Spinning propellers
        const pa = bird.propAngle;
        armPositions.forEach(([ax, ay], idx) => {
            const angle = pa + idx * Math.PI / 2;
            ctx.strokeStyle = `rgba(${f.color === '#3B82F6' ? '59,130,246' : '34,197,94'},0.7)`;
            ctx.lineWidth = 1.5;
            const propR = 7 * s;
            ctx.beginPath();
            ctx.moveTo(ax + Math.cos(angle) * propR, ay + Math.sin(angle) * propR);
            ctx.lineTo(ax - Math.cos(angle) * propR, ay - Math.sin(angle) * propR);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax + Math.cos(angle + Math.PI / 2) * propR, ay + Math.sin(angle + Math.PI / 2) * propR);
            ctx.lineTo(ax - Math.cos(angle + Math.PI / 2) * propR, ay - Math.sin(angle + Math.PI / 2) * propR);
            ctx.stroke();
            // Prop circle blur
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(ax, ay, propR, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Camera/sensor (front dot)
        ctx.fillStyle = '#EF4444';
        ctx.beginPath(); ctx.arc(10 * s, 0, 2 * s, 0, Math.PI * 2); ctx.fill();
        // Center LED
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(0, 0, 2.5 * s, 0, Math.PI * 2); ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();

        // --- BARREL ROLL COOLDOWN RING ---
        if (barrelRollRef.current.cooldown > 0 && !barrelRollRef.current.active) {
            const barrelCooldownMax = Math.max(1, progressionRef.current.barrelCooldown);
            const cdPct = 1 - barrelRollRef.current.cooldown / barrelCooldownMax;
            ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(bird.x, bird.y, bird.radius + 18, -Math.PI / 2, -Math.PI / 2 + cdPct * Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        } else if (barrelRollRef.current.cooldown <= 0 && !barrelRollRef.current.active) {
            // Ready indicator — subtle pulse
            const pulse = Math.sin(frameCountRef.current * 0.1) * 0.2 + 0.3;
            ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 1;
            ctx.globalAlpha = pulse;
            ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.radius + 18, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // --- EMP CHARGE METER (bottom-right) ---
        const empD = empRef.current;
        const empBarW = 60, empBarH = 8;
        const empX = W - empBarW - 12, empY = H - 44;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(empX - 2, empY - 2, empBarW + 4, empBarH + 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(empX, empY, empBarW, empBarH);
        const empPct = empD.charge / empD.maxCharge;
        const empColor = empPct >= 1 ? '#00FFFF' : '#0088AA';
        ctx.fillStyle = empColor;
        ctx.fillRect(empX, empY, empBarW * empPct, empBarH);
        if (empPct >= 1) {
            ctx.shadowBlur = 8; ctx.shadowColor = '#00FFFF';
            ctx.fillRect(empX, empY, empBarW, empBarH);
            ctx.shadowBlur = 0;
        }
        ctx.font = '8px "Orbitron", monospace'; ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(empPct >= 1 ? '⚡ EMP READY' : `⚡ ${empD.charge}/${empD.maxCharge}`, empX + empBarW / 2, empY - 4);

        // --- EMP SHOCKWAVE ---
        if (empD.blastTimer > 0) {
            const progress = 1 - empD.blastTimer / 30;
            const radius = progress * 200;
            ctx.globalAlpha = 1 - progress;
            ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 3 - progress * 2;
            ctx.beginPath(); ctx.arc(empD.blastX, empD.blastY, radius, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(0,255,255,0.3)'; ctx.lineWidth = 8 - progress * 7;
            ctx.beginPath(); ctx.arc(empD.blastX, empD.blastY, radius * 0.7, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // --- HOMING MISSILES ---
        missilesRef.current.forEach(m => {
            // Warning phase — blinking ⚠️ indicator
            if (m.warning > 0) {
                const shouldDrawWarning = accessibilityPrefs.reducedMotion ? true : Math.floor(m.warning / 6) % 2 === 0;
                if (shouldDrawWarning) {
                    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#FF0000';
                    ctx.fillText('⚠️', m.x, m.y);
                    ctx.shadowBlur = accessibilityPrefs.reducedMotion ? 0 : 20; ctx.shadowColor = '#FF0000';
                    ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, Math.PI * 2); ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                return;
            }
            // Trail
            const isTracking = m.age <= m.trackingLife;
            m.trail.forEach(t => {
                ctx.globalAlpha = t.life / 15 * 0.5;
                ctx.fillStyle = isTracking ? '#FF4400' : '#FF8800';
                ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            // Missile body
            const angle = Math.atan2(m.vy, m.vx);
            ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(angle);
            ctx.fillStyle = isTracking ? '#CC0000' : '#AA6600';
            ctx.beginPath();
            ctx.moveTo(10, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4);
            ctx.closePath(); ctx.fill();
            // Fins
            ctx.fillStyle = isTracking ? '#880000' : '#774400';
            ctx.fillRect(-8, -5, 3, 2); ctx.fillRect(-8, 3, 3, 2);
            // Flame (bigger when tracking)
            ctx.fillStyle = isTracking ? '#FF8800' : '#FF6600';
            const flameNoise = Math.sin(frameCountRef.current * 0.21 + m.x * 0.03 + m.y * 0.02);
            const flameLen = isTracking ? -12 - ((flameNoise + 1) * 0.5) * 4 : -8 - ((flameNoise + 1) * 0.5) * 2;
            ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(flameLen, 0); ctx.lineTo(-6, 2); ctx.fill();
            ctx.restore();
            // Ring indicator — red = homing, fading orange = burnout
            ctx.shadowBlur = 8; ctx.shadowColor = isTracking ? '#FF0000' : '#FF660044';
            ctx.strokeStyle = isTracking ? '#FF0000' : 'rgba(255,102,0,0.3)';
            ctx.lineWidth = isTracking ? 1.5 : 0.8;
            ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        });

        // --- PIRATE SHIPS ---
        piratesRef.current.forEach(p => {
            ctx.save(); ctx.translate(p.x, p.y);
            // Hull
            ctx.fillStyle = '#5C3317';
            ctx.beginPath();
            ctx.moveTo(-20, 0); ctx.lineTo(-25, 8); ctx.lineTo(25, 8); ctx.lineTo(20, 0);
            ctx.lineTo(15, -3); ctx.lineTo(-15, -3);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#3D1F0A'; ctx.lineWidth = 1; ctx.stroke();
            // Mast
            ctx.strokeStyle = '#4A2A0A'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -22); ctx.stroke();
            // Sail (skull flag)
            ctx.fillStyle = '#111';
            ctx.fillRect(-8, -20, 16, 12);
            // Skull on flag
            ctx.fillStyle = '#FFF'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('☠', 0, -11);
            // Cannon flash (random)
            if (!accessibilityPrefs.reducedMotion && Math.sin(frameCountRef.current * 0.13 + p.x * 0.08) > 0.98) {
                ctx.fillStyle = '#FF4400';
                ctx.beginPath(); ctx.arc(22, 2, 4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        });

        // --- NEWS TICKER ---
        const tickerH = 28;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, H - tickerH, W, tickerH);
        ctx.fillStyle = '#EF4444'; ctx.fillRect(0, H - tickerH, 4, tickerH);
        // Top border line
        ctx.fillStyle = phase.glow; ctx.fillRect(0, H - tickerH, W, 1);

        ctx.font = 'bold 11px "Inter", sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#EF4444'; ctx.textAlign = 'left';
        ctx.fillText('⚠ LIVE', 10, H - tickerH / 2);

        ctx.save(); ctx.beginPath(); ctx.rect(60, H - tickerH, W - 60, tickerH); ctx.clip();
        const headlines = activeHeadlinesRef.current;
        const fullText = headlines.join('   ●   ');
        ctx.font = '12px "Inter", sans-serif'; ctx.fillStyle = '#E5E5E5';
        const textW = ctx.measureText(fullText).width;
        const xPos = W - (newsOffsetRef.current % (textW + W));
        ctx.fillText(fullText, xPos, H - tickerH / 2);
        ctx.restore();

        // Escalation phase indicator
        ctx.font = 'bold 10px "Orbitron", monospace'; ctx.fillStyle = phase.glow;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText('◆ ' + phase.name, W - 12, 10);
        const runProfile = difficultyRef.current.profile;
        ctx.font = 'bold 9px "Orbitron", monospace';
        ctx.fillStyle = '#93C5FD';
        ctx.fillText(`LEVEL ${runProfile.label.toUpperCase()} • TIER ${progressionRef.current.tier}`, W - 12, 24);

        // --- STREAK FIRE EFFECT ---
        if (streakRef.current >= 5) {
            const intensity = Math.min(1, streakRef.current / 20);
            const bird = birdRef.current;
            // Fire particles behind drone
            if (!accessibilityPrefs.reducedMotion) {
                for (let j = 0; j < Math.floor(intensity * 4); j++) {
                    const pulse = (Math.sin(frameCountRef.current * 0.2 + j * 1.7) + 1) * 0.5;
                    ctx.globalAlpha = 0.4 + pulse * 0.4;
                    ctx.fillStyle = ['#FF4400', '#FF8800', '#FFCC00'][j % 3];
                    ctx.beginPath();
                    ctx.arc(bird.x - 18 - (j * 6), bird.y + Math.sin(frameCountRef.current * 0.15 + j) * 6, 2 + pulse * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            // Streak counter under score
            ctx.font = 'bold 11px "Orbitron", monospace';
            ctx.fillStyle = streakRef.current >= 15 ? '#FF0000' : streakRef.current >= 10 ? '#FF4400' : '#FF8800';
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(`🔥 ${streakRef.current}x`, W / 2, 46);
        }

        // --- COMBO TEXT POPUP ---
        if (comboTextRef.current.timer > 0) {
            const ct = comboTextRef.current;
            const a = Math.min(1, ct.timer / 15);
            const scale = accessibilityPrefs.reducedMotion ? 1 : 1 + (1 - ct.timer / 60) * 0.3;
            ctx.globalAlpha = a;
            ctx.font = `bold ${Math.floor(16 * scale)}px "Orbitron", monospace`;
            ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10; ctx.shadowColor = '#FF4400';
            ctx.fillText(ct.text, W / 2, 80);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // --- NEAR-MISS FLASH ---
        if (nearMissTextRef.current.timer > 0) {
            const nm = nearMissTextRef.current;
            const a = Math.min(1, nm.timer / 10);
            ctx.globalAlpha = a;
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = accessibilityPrefs.reducedMotion ? 0 : 8; ctx.shadowColor = '#FFD700';
            const yOffset = accessibilityPrefs.reducedMotion ? 20 : (40 - nm.timer);
            ctx.fillText('💀 CLOSE CALL!', nm.x, nm.y - yOffset);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // Milestone toast
        if (milestoneToastRef.current.timer > 0) {
            const mt = milestoneToastRef.current;
            const alpha = Math.min(1, mt.timer / 30);
            const boxW = Math.min(340, W - 40);
            const boxH = 56;
            const x = (W - boxW) / 2;
            const y = 112;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(5,15,25,0.9)';
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeStyle = '#22D3EE';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, boxW, boxH);
            ctx.font = 'bold 11px "Orbitron", monospace';
            ctx.fillStyle = '#67E8F9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mt.title, W / 2, y + 18);
            ctx.font = '10px "Inter", sans-serif';
            ctx.fillStyle = '#E5E7EB';
            ctx.fillText(mt.detail, W / 2, y + 37);
            ctx.globalAlpha = 1;
        }

        // Trump quote overlay
        if (trumpQuoteRef.current.timer > 0) {
            const qt = trumpQuoteRef.current;
            const alpha = Math.min(1, qt.timer / 30);
            ctx.globalAlpha = alpha;
            // Background box
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const qw = 320, qh = 60;
            const qx = (W - qw) / 2, qy = H / 2 - 80;
            ctx.fillRect(qx, qy, qw, qh);
            ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
            ctx.strokeRect(qx, qy, qw, qh);
            // Trump emoji + text
            ctx.font = 'bold 13px "Inter", sans-serif'; ctx.fillStyle = '#F59E0B';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🏺 TRUMP SAYS:', W / 2, qy + 16);
            ctx.font = 'italic 12px "Inter", sans-serif'; ctx.fillStyle = '#FFF';
            // Word wrap
            const words = qt.text.split(' ');
            let line = '', ly = qy + 36;
            words.forEach(word => {
                const test = line + word + ' ';
                if (ctx.measureText(test).width > qw - 20) {
                    ctx.fillText(line.trim(), W / 2, ly);
                    line = word + ' '; ly += 16;
                } else { line = test; }
            });
            ctx.fillText(line.trim(), W / 2, ly);
            ctx.globalAlpha = 1;
        }
    }, []);

    // Game loop
    const gameStateRef = useRef(gameState); gameStateRef.current = gameState;
    useEffect(() => {
        const loop = () => {
            if (gameStateRef.current === 'PLAYING') update();
            draw();
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [update, draw]);

    // Input
    useEffect(() => {
        const handleKey = (e) => {
            if ((e.code === 'Escape' || e.code === 'KeyP')) {
                if (gameStateRef.current === 'PLAYING') {
                    e.preventDefault();
                    pauseGame();
                    return;
                }
                if (gameStateRef.current === 'PAUSED') {
                    e.preventDefault();
                    resumeGame();
                    return;
                }
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameStateRef.current === 'START' && factionRef.current) startGame();
                else if (gameStateRef.current === 'PLAYING') flap();
                else if (gameStateRef.current === 'PAUSED') resumeGame();
            }
            if (e.code === 'KeyS' && gameStateRef.current === 'PLAYING') {
                e.preventDefault();
                triggerBarrelRoll();
            }
            if (e.code === 'KeyE' && gameStateRef.current === 'PLAYING') {
                e.preventDefault();
                triggerEMP();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [pauseGame, resumeGame, startGame, flap, triggerBarrelRoll, triggerEMP]);

    const handleCanvasInteraction = (e) => {
        e.preventDefault();
        if (gameState === 'PLAYING') {
            flap();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            addTouchRipple(cx, cy);
            // Track touch start for swipe
            if (e.touches) {
                touchStartRef.current = { y: cy, time: Date.now() };
            }
        }
    };

    const handleTouchEnd = (e) => {
        if (gameState !== 'PLAYING') return;
        const endY = e.changedTouches?.[0]?.clientY;
        if (endY && touchStartRef.current.y) {
            const dy = endY - touchStartRef.current.y;
            const dt = Date.now() - touchStartRef.current.time;
            // Swipe down: >50px within 300ms
            if (dy > 50 && dt < 300) {
                triggerBarrelRoll();
            }
        }
    };

    const selectFaction = (key) => { setFaction(key); factionRef.current = FACTIONS[key]; };
    const selectDifficulty = (levelKey) => {
        if (isDifficultyLocked) return;
        const normalized = parseDifficulty(levelKey) || DEFAULT_DIFFICULTY;
        setSelectedDifficulty(normalized);
    };
    const selectRunMode = (mode) => {
        if (isModeLocked) return;
        if (mode !== 'CLASSIC' && mode !== 'DAILY') return;
        setRunMode(mode);
    };
    const selectModifier = (modifierKey) => {
        if (!RUN_MODIFIERS[modifierKey]) return;
        setSelectedModifier(modifierKey);
    };
    const toggleAccessibility = (key) => {
        if (!['reducedMotion', 'largeUI', 'highContrast'].includes(key)) return;
        setAccessibility(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getShareUrl = () => {
        const base = window.location.origin + window.location.pathname;
        const levelKey = difficultyRef.current.level || selectedDifficultyRef.current;
        const mode = runMetaRef.current.mode || runModeRef.current;
        const modifier = runMetaRef.current.modifier || selectedModifierRef.current;
        return `${base}?seed=${currentSeedRef.current}&score=${scoreRef.current}&difficulty=${levelKey.toLowerCase()}&mode=${mode.toLowerCase()}&modifier=${modifier.toLowerCase()}`;
    };

    const copyShareLink = async () => {
        const msg = `⚔️ I navigated ${scoreRef.current} obstacles in Strait of Chaos! Accept my diplomatic challenge:\n${getShareUrl()}`;
        try { await navigator.clipboard.writeText(msg); } catch {
            const ta = document.createElement('textarea'); ta.value = msg;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    const f = faction ? FACTIONS[faction] : null;
    const difficultyProfile = getDifficultyProfile(selectedDifficulty);
    const highScore = getDifficultyHighScore(highScores, selectedDifficulty);
    const dailyMission = getDailyMission(selectedDifficulty);
    const dailyScoreKey = getDailyScoreKey(dailyMission.dateKey, selectedDifficulty);
    const dailyBestScore = Number.isFinite(dailyScores?.[dailyScoreKey]) ? dailyScores[dailyScoreKey] : 0;
    const dailyMedal = getMedalForScore(dailyBestScore, dailyMission.medals);
    const runModifierMeta = RUN_MODIFIERS[selectedModifier] || RUN_MODIFIERS.NONE;
    const runLevelKey = runMetaRef.current.level || selectedDifficulty;
    const runDailyTargets = DAILY_MEDAL_TARGETS[runLevelKey] || DAILY_MEDAL_TARGETS[DEFAULT_DIFFICULTY];
    const runDailyScoreKey = getDailyScoreKey(runMetaRef.current.dailyDateKey, runLevelKey);
    const storedRunDailyBest = Number.isFinite(dailyScores?.[runDailyScoreKey]) ? dailyScores[runDailyScoreKey] : 0;
    const runDailyBestScore = runMetaRef.current.mode === 'DAILY' ? Math.max(storedRunDailyBest, score) : storedRunDailyBest;
    const runDailyMedal = getMedalForScore(score, runDailyTargets);
    const scoreTier = Math.min(MILESTONE_UPGRADES.length, Math.floor(score / 10));
    const nextMilestoneDelta = scoreTier >= MILESTONE_UPGRADES.length ? 0 : (10 - (score % 10));
    const phase = getEscalationPhase(score);

    return (
        <div
            className={`soc-root${accessibility.largeUI ? ' soc-large-ui' : ''}${accessibility.highContrast ? ' soc-high-contrast' : ''}${accessibility.reducedMotion ? ' soc-reduced-motion' : ''}`}
            style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', position: 'relative', touchAction: 'none', userSelect: 'none' }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;600&family=Black+Ops+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .soc-root.soc-large-ui .soc-screen { width: clamp(360px, 90vw, 520px); }
        .soc-root.soc-large-ui .soc-tab-btn { font-size: 12px; padding: 12px; }
        .soc-root.soc-large-ui .soc-btn { font-size: 15px; min-height: 54px; }
        .soc-root.soc-large-ui .soc-score { font-size: clamp(30px,7vw,54px); }
        .soc-root.soc-high-contrast .soc-screen { border-color: #fff; background: rgba(0,0,0,0.96); }
        .soc-root.soc-high-contrast .soc-tab-btn.active { color: #fff; border-bottom-color: #fff; }
        .soc-root.soc-high-contrast .soc-btn-play { background: #fff; color: #000; box-shadow: 0 0 0 2px #fff; }
        .soc-root.soc-high-contrast .soc-label, .soc-root.soc-high-contrast .soc-tagline, .soc-root.soc-high-contrast p { color: #E5E7EB; }
        .soc-root.soc-reduced-motion .soc-screen::after, .soc-root.soc-reduced-motion .soc-crt { display: none; }
        .soc-root.soc-reduced-motion .soc-btn, .soc-root.soc-reduced-motion .soc-tab-btn { transition: none; animation: none; }
        .soc-wrap { position: relative; width: ${canvasSize.width}px; height: ${canvasSize.height}px; border: 2px solid rgba(239,68,68,0.4); box-shadow: 0 0 30px rgba(239,68,68,0.2), inset 0 0 30px rgba(0,0,0,0.5); border-radius: 12px; overflow: hidden; }
        .soc-wrap canvas { display: block; width: 100%; height: 100%; touch-action: manipulation; }
        .soc-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
        .soc-score { position: absolute; top: clamp(8px,3vw,24px); left: 0; right: 0; text-align: center; font-family: 'Orbitron', monospace; font-size: clamp(24px,6vw,48px); font-weight: 900; color: #fff; text-shadow: 0 0 15px ${phase.glow}; z-index: 10; letter-spacing: 2px; }
        .soc-screen { pointer-events: auto; background: rgba(5, 5, 10, 0.96); backdrop-filter: blur(20px); border: 1px solid rgba(239,68,68,0.5); border-radius: 16px; padding: 0; text-align: center; max-width: 90%; width: clamp(320px, 85vw, 460px); box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(239,68,68,0.2); animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; position: relative; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        /* New Header/Tab System */
        .soc-header { background: rgba(239, 68, 68, 0.1); border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 16px 20px 0; display: flex; flex-direction: column; align-items: center; }
        .soc-header h1 { font-family: 'Black Ops One', cursive; font-size: clamp(22px, 6vw, 32px); color: #EF4444; text-shadow: 0 0 15px rgba(239,68,68,0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px; }
        .soc-tabs { display: flex; width: 100%; gap: 2px; margin-top: 4px; }
        .soc-tab-btn { flex: 1; background: transparent; border: none; padding: 10px; color: #666; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; text-transform: uppercase; letter-spacing: 1px; }
        .soc-tab-btn.active { color: #EF4444; border-bottom-color: #EF4444; background: rgba(239, 68, 68, 0.05); }
        .soc-tab-btn:hover:not(.active) { color: #aaa; background: rgba(255, 255, 255, 0.03); }

        .soc-body { padding: 20px; max-height: 70vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(239, 68, 68, 0.3) transparent; }
        .soc-body::-webkit-scrollbar { width: 4px; }
        .soc-body::-webkit-scrollbar-thumb { background: rgba(239, 68, 68, 0.3); border-radius: 10px; }
        
        .soc-section-title { font-family: 'Orbitron', sans-serif; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 16px 0 8px; display: flex; align-items: center; gap: 8px; }
        .soc-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(239,68,68,0.2), transparent); }

        .soc-screen h1 { margin-bottom: 0; }
        .soc-screen p { font-family: 'Inter', sans-serif; color: #94a3b8; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
        .soc-screen .hl { color: #F59E0B; font-weight: 700; }
        
        .soc-btn { display: inline-block; font-family: 'Orbitron', monospace; font-weight: 700; font-size: 14px; padding: 14px 28px; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1.5px; transition: all 0.2s; min-height: 48px; position: relative; overflow: hidden; }
        .soc-btn-play { background: #EF4444; color: #fff; box-shadow: 0 4px 15px rgba(239,68,68,0.3); width: 100%; }
        .soc-btn-play:hover { background: #F87171; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239,68,68,0.4); }
        .soc-btn-play::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: shine 3s infinite; }
        @keyframes shine { 100% { left: 100%; } }

        .soc-faction-row { display: flex; gap: 12px; justify-content: center; margin: 12px 0; }
        .soc-faction { padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; text-align: center; flex: 1; position: relative; }
        .soc-faction:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
        .soc-faction.active-usa { border-color: #3B82F6; background: rgba(59,130,246,0.1); box-shadow: inset 0 0 15px rgba(59,130,246,0.1); }
        .soc-faction.active-iran { border-color: #22C55E; background: rgba(34,197,94,0.1); box-shadow: inset 0 0 15px rgba(34,197,94,0.1); }
        .soc-faction-emoji { font-size: 32px; display: block; margin-bottom: 4px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
        .soc-faction-name { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 1px; }

        .soc-difficulty-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
        .soc-difficulty { border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #d1d5db; padding: 12px 8px; text-align: center; transition: all 0.2s; cursor: pointer; }
        .soc-difficulty:hover:not(:disabled) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .soc-difficulty.active { border-color: #F59E0B; background: rgba(245,158,11,0.08); color: #F59E0B; }
        .soc-difficulty-name { display: block; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; margin-bottom: 4px; }
        .soc-difficulty-meta { display: block; font-family: 'Inter', sans-serif; font-size: 9px; opacity: 0.7; line-height: 1.2; }
        .soc-lock-note { color: #F59E0B; font-size: 10px; margin-top: 4px; }

        .soc-mode-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
        .soc-mode { border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #cbd5e1; padding: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .soc-mode.active { border-color: #22D3EE; background: rgba(34,211,238,0.08); color: #67E8F9; }
        .soc-mode:disabled { opacity: 0.55; cursor: not-allowed; }
        .soc-mode-title { display: block; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; margin-bottom: 2px; }
        .soc-mode-desc { display: block; font-family: 'Inter', sans-serif; font-size: 9px; opacity: 0.75; }

        .soc-modifier-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 10px 0; }
        .soc-modifier { border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: #cbd5e1; padding: 9px; text-align: left; cursor: pointer; transition: all 0.2s; }
        .soc-modifier.active { border-color: #A78BFA; background: rgba(167,139,250,0.1); color: #DDD6FE; }
        .soc-modifier-title { display: block; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; margin-bottom: 2px; }
        .soc-modifier-desc { display: block; font-family: 'Inter', sans-serif; font-size: 9px; opacity: 0.75; line-height: 1.25; }
        .soc-a11y-row { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 10px 0 0; }
        .soc-a11y-toggle { border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.02); color: #CBD5E1; padding: 8px 10px; text-align: left; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; font-size: 11px; }
        .soc-a11y-toggle.active { border-color: #22C55E; background: rgba(34,197,94,0.12); color: #BBF7D0; }
        .soc-a11y-pill { font-family: 'Orbitron', sans-serif; font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase; }

        .soc-daily-panel { border: 1px solid rgba(34,211,238,0.35); background: rgba(34,211,238,0.07); border-radius: 10px; padding: 10px; margin: 10px 0; text-align: left; }
        .soc-daily-title { font-family: 'Orbitron', sans-serif; font-size: 11px; color: #67E8F9; margin-bottom: 4px; }
        .soc-badge { display: inline-flex; align-items: center; border: 1px solid rgba(245,158,11,0.5); color: #FBBF24; background: rgba(245,158,11,0.1); border-radius: 999px; padding: 2px 8px; font-size: 10px; font-family: 'Orbitron', sans-serif; margin-left: 6px; }

        .soc-intel-item { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; text-align: left; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
        .soc-intel-icon { font-size: 20px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 6px; flex-shrink: 0; }
        .soc-intel-content h4 { font-family: 'Orbitron', sans-serif; font-size: 12px; margin-bottom: 2px; color: #eee; }
        .soc-intel-content p { font-size: 11px; margin-bottom: 0; color: #888; line-height: 1.4; }

        .soc-footer { padding: 20px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); }
        .soc-tagline { font-family: 'Inter', sans-serif; font-size: 11px; color: #64748b; margin-top: 4px; letter-spacing: 0.5px; }

        /* Scanline effect */
        .soc-screen::after { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03)); z-index: 2; background-size: 100% 2px, 3px 100%; pointer-events: none; }
        
        .soc-btn-share { background: transparent; border: 1px solid #F59E0B; color: #F59E0B; }
        .soc-btn-share:hover { background: rgba(245,158,11,0.1); }
        .soc-btn-sec { background: rgba(255,255,255,0.05); color: #aaa; border: 1px solid rgba(255,255,255,0.1); }
        
        .soc-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 16px 0; }
        .soc-label { font-family: 'Orbitron', sans-serif; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; }
        .soc-score-big { font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 900; color: #fff; margin: 8px 0; }
        
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        .soc-hint { animation: pulse 2s infinite; }
        .soc-challenge-banner { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15)); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: clamp(8px,2vw,12px); margin-bottom: clamp(8px,1.5vw,12px); }
        .soc-challenge-banner p { margin: 0; font-size: clamp(11px,2.5vw,13px); color: #EF4444; font-weight: 600; }
        .soc-challenge-banner .ts { font-family: 'Orbitron', monospace; font-size: clamp(18px,5vw,28px); font-weight: 900; color: #EF4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
        .soc-tagline { font-family: 'Inter', sans-serif; font-size: clamp(9px,2.2vw,12px); color: #F59E0B; font-style: italic; letter-spacing: 0.5px; }
        @media (max-width: 480px) { .soc-wrap { border: none; border-radius: 0; } }
        .soc-sound-btn { position: absolute; top: 10px; left: 10px; z-index: 20; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: #fff; transition: background 0.2s; pointer-events: auto; -webkit-tap-highlight-color: transparent; }
        .soc-sound-btn:hover { background: rgba(255,255,255,0.15); }
        .soc-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
        .soc-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 4px; text-align: center; }
        .soc-stat-val { font-family: 'Orbitron', monospace; font-weight: 700; font-size: 18px; color: #fff; }
        .soc-stat-lbl { font-family: 'Inter', sans-serif; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .soc-death-card { border: 1px solid rgba(239,68,68,0.45); background: rgba(239,68,68,0.08); border-radius: 10px; padding: 10px; margin: 10px 0; text-align: left; }
        .soc-death-title { font-family: 'Orbitron', sans-serif; font-size: 11px; color: #FCA5A5; margin-bottom: 3px; }
        .soc-death-tip { font-family: 'Inter', sans-serif; font-size: 11px; color: #CBD5E1; line-height: 1.35; margin: 0; }
        
        /* CRT Scanline Overlay */
        .soc-crt { position: absolute; inset: 0; pointer-events: none; z-index: 5; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02)); background-size: 100% 3px, 3px 100%; opacity: 0.5; }
        .soc-run-hud { position: absolute; top: 10px; right: 10px; z-index: 21; background: rgba(0,0,0,0.55); border: 1px solid rgba(147,197,253,0.45); border-radius: 10px; padding: 6px 8px; pointer-events: none; text-align: right; max-width: 190px; }
        .soc-run-level { font-family: 'Orbitron', monospace; color: #BAE6FD; font-size: clamp(9px,2vw,11px); letter-spacing: 0.4px; font-weight: 700; text-transform: uppercase; }
        .soc-run-upgrade { font-family: 'Inter', sans-serif; color: #CBD5E1; font-size: clamp(8px,1.8vw,10px); margin-top: 1px; }
      `}</style>

            <div className="soc-wrap">
                {!accessibility.reducedMotion && !accessibility.highContrast && <div className="soc-crt" />}
                <canvas ref={canvasRef} width={CONFIG.INTERNAL_WIDTH} height={CONFIG.INTERNAL_HEIGHT}
                    onClick={handleCanvasInteraction} onTouchStart={handleCanvasInteraction} onTouchEnd={handleTouchEnd} />

                {/* Sound Toggle */}
                <div className="soc-sound-btn" onClick={(e) => { e.stopPropagation(); setSoundEnabled(v => !v); }}>
                    {soundEnabled ? '🔊' : '🔇'}
                </div>
                {gameState === 'PLAYING' && (
                    <div className="soc-sound-btn" style={{ left: '56px' }} onClick={(e) => { e.stopPropagation(); pauseGame(); }}>
                        ⏸
                    </div>
                )}

                {gameState === 'PLAYING' && <div className="soc-score">{score}</div>}
                {gameState === 'PLAYING' && (
                    <div className="soc-run-hud">
                        <div className="soc-run-level">{difficultyProfile.label} Level</div>
                        <div className="soc-run-upgrade">
                            {scoreTier >= MILESTONE_UPGRADES.length ? 'All upgrades unlocked' : `Next upgrade in ${nextMilestoneDelta} towers`}
                        </div>
                        <div className="soc-run-upgrade">
                            {runMetaRef.current.mode === 'DAILY' ? `Daily ${runMetaRef.current.dailyDateKey}` : 'Classic'} • {RUN_MODIFIERS[runMetaRef.current.modifier]?.label || 'Standard'}
                        </div>
                    </div>
                )}
                {gameState === 'PLAYING' && tutorialUi.active && (
                    <div style={{
                        position: 'absolute',
                        top: '56px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 30,
                        background: 'rgba(0,0,0,0.78)',
                        border: '1px solid rgba(34,211,238,0.65)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        minWidth: '250px',
                        textAlign: 'center',
                        pointerEvents: 'none',
                    }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', color: '#67E8F9' }}>
                            TUTORIAL {tutorialUi.stepIndex + 1}/3 • {Math.ceil(tutorialUi.remainingFrames / 60)}s
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#E5E7EB', marginTop: '2px' }}>
                            {TUTORIAL_STEPS[tutorialUi.stepIndex]?.title}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                            {TUTORIAL_STEPS[tutorialUi.stepIndex]?.detail}
                            {tutorialUi.stepIndex === 0 ? ` (${tutorialUi.flapCount}/3)` : ''}
                        </div>
                    </div>
                )}

                {/* Mobile Ability Buttons */}
                {gameState === 'PLAYING' && (
                    <>
                        <div onClick={(e) => { e.stopPropagation(); triggerBarrelRoll(); }} style={{
                            position: 'absolute', bottom: '50px', left: '14px', zIndex: 20, width: '52px', height: '52px',
                            borderRadius: '50%', background: barrelRollRef.current.cooldown > 0 ? 'rgba(0,0,0,0.4)' : 'rgba(0,255,255,0.15)',
                            border: `2px solid ${barrelRollRef.current.cooldown > 0 ? 'rgba(100,100,100,0.4)' : 'rgba(0,255,255,0.6)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            fontSize: '22px', pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent',
                            boxShadow: barrelRollRef.current.cooldown <= 0 ? '0 0 12px rgba(0,255,255,0.3)' : 'none',
                        }}>
                            🔄
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); triggerEMP(); }} style={{
                            position: 'absolute', bottom: '50px', right: '14px', zIndex: 20, width: '52px', height: '52px',
                            borderRadius: '50%', background: empRef.current.charge >= empRef.current.maxCharge ? 'rgba(0,255,255,0.2)' : 'rgba(0,0,0,0.4)',
                            border: `2px solid ${empRef.current.charge >= empRef.current.maxCharge ? 'rgba(0,255,255,0.7)' : 'rgba(100,100,100,0.3)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            fontSize: '22px', pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent',
                            boxShadow: empRef.current.charge >= empRef.current.maxCharge ? '0 0 15px rgba(0,255,255,0.4)' : 'none',
                            opacity: empRef.current.charge >= empRef.current.maxCharge ? 1 : 0.5,
                        }}>
                            ⚡
                        </div>
                    </>
                )}

                {gameState === 'START' && (
                    <div className="soc-overlay">
                        <div className="soc-screen">
                            <div className="soc-header">
                                <h1>Strait of Chaos</h1>
                                <div className="soc-tabs">
                                    <button className={`soc-tab-btn ${activeTab === 'MISSION' ? 'active' : ''}`} onClick={() => setActiveTab('MISSION')}>Mission</button>
                                    <button className={`soc-tab-btn ${activeTab === 'INTEL' ? 'active' : ''}`} onClick={() => setActiveTab('INTEL')}>Intelligence</button>
                                </div>
                            </div>

                            <div className="soc-body">
                                {activeTab === 'MISSION' ? (
                                    <>
                                        <p style={{ marginTop: '10px' }}>Navigate the world's most dangerous strait.</p>

                                        {isChallenge && challengeScore.current !== null && (
                                            <div className="soc-challenge-banner" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', padding: '12px', margin: '12px 0' }}>
                                                <p style={{ margin: 0, fontWeight: 700, color: '#EF4444' }}>DIPLOMATIC CHALLENGE</p>
                                                <div style={{ fontSize: '28px', fontFamily: 'Orbitron', color: '#fff', margin: '4px 0' }}>{challengeScore.current}</div>
                                                <p style={{ fontSize: '10px', margin: 0, opacity: 0.8 }}>Score to beat from the opposing faction</p>
                                                {challengeDifficulty.current && <p style={{ marginTop: '6px', fontSize: '10px' }}>Difficulty lock: <span className="hl">{getDifficultyProfile(challengeDifficulty.current).label}</span></p>}
                                            </div>
                                        )}

                                        <div className="soc-section-title">Select Faction</div>
                                        <div className="soc-faction-row">
                                            <div className={`soc-faction ${faction === 'USA' ? 'active-usa' : ''}`} onClick={() => selectFaction('USA')}>
                                                <span className="soc-faction-emoji">🦅</span>
                                                <div className="soc-faction-name">USA</div>
                                            </div>
                                            <div className={`soc-faction ${faction === 'IRAN' ? 'active-iran' : ''}`} onClick={() => selectFaction('IRAN')}>
                                                <span className="soc-faction-emoji">🕊️</span>
                                                <div className="soc-faction-name">IRAN</div>
                                            </div>
                                        </div>

                                        <div className="soc-section-title">Choose Difficulty</div>
                                        <div className="soc-difficulty-row">
                                            {Object.entries(DIFFICULTY_LEVELS).map(([key, level]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    disabled={isDifficultyLocked}
                                                    className={`soc-difficulty ${selectedDifficulty === key ? 'active' : ''}`}
                                                    onClick={() => selectDifficulty(key)}
                                                >
                                                    <span className="soc-difficulty-name">{level.label}</span>
                                                    <span className="soc-difficulty-meta">{level.tagline}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {isDifficultyLocked && <p className="soc-lock-note" style={{ color: '#F59E0B', fontSize: '10px', marginTop: '4px' }}>⚠️ Difficulty locked for challenge fairness.</p>}

                                        <div className="soc-section-title">Run Mode</div>
                                        <div className="soc-mode-row">
                                            <button
                                                type="button"
                                                className={`soc-mode ${runMode === 'CLASSIC' ? 'active' : ''}`}
                                                disabled={isModeLocked}
                                                onClick={() => selectRunMode('CLASSIC')}
                                            >
                                                <span className="soc-mode-title">Classic</span>
                                                <span className="soc-mode-desc">Randomized sandbox</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`soc-mode ${runMode === 'DAILY' ? 'active' : ''}`}
                                                disabled={isModeLocked}
                                                onClick={() => selectRunMode('DAILY')}
                                            >
                                                <span className="soc-mode-title">Daily Mission</span>
                                                <span className="soc-mode-desc">Fixed seed for the day</span>
                                            </button>
                                        </div>

                                        {runMode === 'DAILY' && !isModeLocked && (
                                            <div className="soc-daily-panel">
                                                <div className="soc-daily-title">
                                                    Daily Seed: {dailyMission.dateKey}
                                                    <span className="soc-badge">{dailyMedal}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>
                                                    Best today: <strong>{dailyBestScore}</strong> | Targets: B {dailyMission.medals.bronze} / S {dailyMission.medals.silver} / G {dailyMission.medals.gold}
                                                </p>
                                            </div>
                                        )}

                                        <div className="soc-section-title">Loadout Modifier</div>
                                        <div className="soc-modifier-row">
                                            {Object.entries(RUN_MODIFIERS).map(([key, meta]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className={`soc-modifier ${selectedModifier === key ? 'active' : ''}`}
                                                    onClick={() => selectModifier(key)}
                                                >
                                                    <span className="soc-modifier-title">{meta.label}</span>
                                                    <span className="soc-modifier-desc">{meta.desc}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="soc-section-title">Accessibility</div>
                                        <div className="soc-a11y-row">
                                            <button
                                                type="button"
                                                className={`soc-a11y-toggle ${accessibility.reducedMotion ? 'active' : ''}`}
                                                onClick={() => toggleAccessibility('reducedMotion')}
                                            >
                                                <span>Reduced Motion & Flash</span>
                                                <span className="soc-a11y-pill">{accessibility.reducedMotion ? 'On' : 'Off'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`soc-a11y-toggle ${accessibility.largeUI ? 'active' : ''}`}
                                                onClick={() => toggleAccessibility('largeUI')}
                                            >
                                                <span>Larger Interface</span>
                                                <span className="soc-a11y-pill">{accessibility.largeUI ? 'On' : 'Off'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`soc-a11y-toggle ${accessibility.highContrast ? 'active' : ''}`}
                                                onClick={() => toggleAccessibility('highContrast')}
                                            >
                                                <span>High Contrast Mode</span>
                                                <span className="soc-a11y-pill">{accessibility.highContrast ? 'On' : 'Off'}</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="soc-section-title">Operational Intel</div>

                                        <div className="soc-intel-item">
                                            <div className="soc-intel-icon">🎮</div>
                                            <div className="soc-intel-content">
                                                <h4>Combat Controls</h4>
                                                <p><span className="hl">TAP / CLICK</span> to thrust upward. Avoid stalling or hitting obstacles. Gravity is your enemy.</p>
                                            </div>
                                        </div>

                                        <div className="soc-intel-item">
                                            <div className="soc-intel-icon">⚠️</div>
                                            <div className="soc-intel-content">
                                                <h4>Hostile Obstacles</h4>
                                                <p><strong style={{ color: '#EF4444' }}>Missile Towers:</strong> Concrete death. Avoid.<br />
                                                    <strong style={{ color: '#F59E0B' }}>Sanctions:</strong> Golden walls. They slow you down but don't kill.</p>
                                            </div>
                                        </div>

                                        <div className="soc-intel-item">
                                            <div className="soc-intel-icon">✨</div>
                                            <div className="soc-intel-content">
                                                <h4>Field Assets</h4>
                                                <p><strong style={{ color: '#F59E0B' }}>Oil:</strong> Speed boost.<br />
                                                    <strong style={{ color: '#fff' }}>Peace Treaty:</strong> 5s Invulnerability shield.</p>
                                            </div>
                                        </div>

                                        <div className="soc-intel-item">
                                            <div className="soc-intel-icon">🎯</div>
                                            <div className="soc-intel-content">
                                                <h4>Advance Maneuvers</h4>
                                                <p><strong style={{ color: '#00CCCC' }}>Barrel Roll (S):</strong> Phase through threats.<br />
                                                    <strong style={{ color: '#00CCCC' }}>EMP (E):</strong> Clear local airspace.</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="soc-footer">
                                <button className="soc-btn soc-btn-play" onClick={startGame} style={{ opacity: faction ? 1 : 0.4, pointerEvents: faction ? 'auto' : 'none' }}>
                                    {isChallenge ? 'Accept Challenge' : runMode === 'DAILY' ? 'Start Daily Mission' : 'Begin Deployment'}
                                </button>
                                {needsTutorial && !isChallenge && (
                                    <p className="soc-tagline" style={{ color: '#67E8F9', marginTop: '6px' }}>
                                        First deployment includes a 20-second guided tutorial.
                                    </p>
                                )}
                                <p className="soc-tagline">Loadout: {runModifierMeta.label} • Authorized personnel only beyond this point.</p>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'PAUSED' && (
                    <div className="soc-overlay">
                        <div className="soc-screen" style={{ width: 'clamp(280px, 70vw, 420px)' }}>
                            <div className="soc-header" style={{ padding: '18px 20px' }}>
                                <h1 style={{ fontSize: 'clamp(20px,5vw,28px)' }}>Paused</h1>
                            </div>
                            <div className="soc-body">
                                <p style={{ marginBottom: '10px' }}>Mission is on hold.</p>
                                {!confirmRestart ? (
                                    <div className="soc-btn-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                        <button className="soc-btn soc-btn-play" onClick={resumeGame}>Resume Mission</button>
                                        <button className="soc-btn soc-btn-sec" onClick={requestRestart}>Restart Run</button>
                                        <button className="soc-btn soc-btn-sec" onClick={quitToBriefing}>Back to Briefing</button>
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', padding: '12px' }}>
                                        <p style={{ marginBottom: '10px', color: '#FCA5A5' }}>Restart current run? Progress will be lost.</p>
                                        <div className="soc-btn-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <button className="soc-btn soc-btn-play" onClick={confirmRestartRun}>Yes, Restart</button>
                                            <button className="soc-btn soc-btn-sec" onClick={cancelRestart}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="soc-overlay">
                        <div className="soc-screen">
                            <div className="soc-header" style={{ padding: '20px' }}>
                                <h1 style={{ color: score >= (challengeScore.current || 0) ? '#22C55E' : '#EF4444' }}>
                                    {isChallenge ? (score >= challengeScore.current ? 'Victory' : 'Defeated') : 'Mission Ended'}
                                </h1>
                            </div>

                            <div className="soc-body">
                                <div className="soc-label" style={{ marginBottom: '4px' }}>Obstacles Cleared</div>
                                <div className="soc-score-big" style={{ fontSize: '64px', textShadow: `0 0 20px ${phase.glow}` }}>{score}</div>
                                {deathReport.label && (
                                    <div className="soc-death-card">
                                        <div className="soc-death-title">Failure Cause: {deathReport.label}</div>
                                        <p className="soc-death-tip">{deathReport.tip}</p>
                                    </div>
                                )}

                                <div className="soc-stats-grid">
                                    <div className="soc-stat">
                                        <div className="soc-stat-val" style={{ color: '#F59E0B' }}>{highScore}</div>
                                        <div className="soc-stat-lbl">{difficultyProfile.label} Record</div>
                                    </div>
                                    <div className="soc-stat">
                                        <div className="soc-stat-val" style={{ color: '#3B82F6' }}>{scoreTier}</div>
                                        <div className="soc-stat-lbl">Tier</div>
                                    </div>
                                    <div className="soc-stat">
                                        <div className="soc-stat-val" style={{ color: '#EF4444' }}>{streakRef.current}</div>
                                        <div className="soc-stat-lbl">Final Streak</div>
                                    </div>
                                </div>

                                {isChallenge && challengeScore.current !== null && (
                                    <div className={`soc-result ${score >= challengeScore.current ? 'win' : 'lose'}`} style={{ margin: '16px 0', padding: '12px' }}>
                                        <div className="soc-label" style={{ color: 'inherit', marginBottom: '4px' }}>Vs Rival Nation</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900 }}>{score >= challengeScore.current ? 'MISSION ACCOMPLISHED 🏆' : 'STRATEGIC FAILURE 💀'}</div>
                                    </div>
                                )}

                                {runMetaRef.current.mode === 'DAILY' && (
                                    <div className="soc-daily-panel">
                                        <div className="soc-daily-title">
                                            Daily Result ({runMetaRef.current.dailyDateKey}) <span className="soc-badge">{runDailyMedal}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>
                                            Daily best: <strong>{runDailyBestScore}</strong> | Targets: B {runDailyTargets.bronze} / S {runDailyTargets.silver} / G {runDailyTargets.gold}
                                        </p>
                                    </div>
                                )}

                                <div className="soc-section-title">Performance Metrics</div>
                                <div className="soc-stats-grid">
                                    <div className="soc-stat">
                                        <div className="soc-stat-val">🔥 {bestStreakRef.current}</div>
                                        <div className="soc-stat-lbl">Max Streak</div>
                                    </div>
                                    <div className="soc-stat">
                                        <div className="soc-stat-val">💀 {nearMissCountRef.current}</div>
                                        <div className="soc-stat-lbl">Near Miss</div>
                                    </div>
                                    <div className="soc-stat">
                                        <div className="soc-stat-val">🚀 {missilesDodgedRef.current}</div>
                                        <div className="soc-stat-lbl">Dodge</div>
                                    </div>
                                </div>
                            </div>

                            <div className="soc-footer">
                                <div className="soc-btn-row" style={{ display: 'flex', gap: '10px' }}>
                                    <button className="soc-btn soc-btn-play" onClick={startGame} style={{ flex: 1 }}>Re-Deploy</button>
                                    <button className="soc-btn soc-btn-share" onClick={() => setShowShareModal(true)} style={{ flex: 1 }}>Share Intel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showShareModal && (
                    <div className="soc-overlay" style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto', cursor: 'pointer' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
                        <div className="soc-screen" onClick={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
                            <h1 style={{ fontSize: 'clamp(16px,4vw,22px)' }}>⚔️ Diplomatic Challenge</h1>
                            <p>Share this link — your rival will navigate the <span className="hl">exact same strait</span> and try to beat your record!</p>
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: 'clamp(8px,2vw,14px)', margin: 'clamp(6px,1.5vw,10px) 0', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 'clamp(9px,2vw,11px)', color: '#F59E0B', lineHeight: 1.4 }}>
                                {getShareUrl()}
                            </div>
                            <div className="soc-btn-row">
                                <button className={`soc-btn soc-btn-play`} onClick={copyShareLink}>
                                    {copied ? '✅ Intel Copied!' : '📋 Copy Challenge Link'}
                                </button>
                                <button className="soc-btn soc-btn-sec" onClick={() => setShowShareModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StraitOfChaos;
