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
        tagline: 'Wide gaps, slower pace',
        gravity: 0.165,
        flapStrength: -3.65,
        speedStart: 0.72,
        maxSpeed: 1.55,
        spawnRateStart: 240,
        minSpawnRate: 165,
        gapStart: 190,
        minGap: 150,
        speedInc: 0.22,
        spawnStep: 4,
        gapStep: 1.5,
        sanctionEvery: 6,
        missileStartScore: 5,
        missileSpawnEvery: 420,
        pirateStartScore: 10,
        pirateSpawnEvery: 420,
        powerupChance: 0.42,
    },
    MEDIUM: {
        label: 'Medium',
        tagline: 'Balanced chaos',
        gravity: 0.18,
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

const HIGH_SCORE_STORAGE_KEY = 'straitChaosHighScoresByDifficulty';
const DEFAULT_DIFFICULTY = 'MEDIUM';

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
    const isChallenge = challengeSeed.current !== null;
    const isDifficultyLocked = isChallenge && challengeDifficulty.current !== null;

    const [gameState, setGameState] = useState('START');
    const [score, setScore] = useState(0);
    const [faction, setFaction] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(challengeDifficulty.current || DEFAULT_DIFFICULTY);
    const [highScores, setHighScores] = useState(readDifficultyHighScores);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
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
    const progressionRef = useRef({ tier: 0, barrelCooldown: 240, empMaxCharge: 5, powerupBonus: 0, shieldBonusFrames: 0 });
    const milestoneToastRef = useRef({ title: '', detail: '', timer: 0 });
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
        if (isDifficultyLocked && challengeDifficulty.current && selectedDifficulty !== challengeDifficulty.current) {
            setSelectedDifficulty(challengeDifficulty.current);
            selectedDifficultyRef.current = challengeDifficulty.current;
        }
    }, [isDifficultyLocked, selectedDifficulty]);

    useEffect(() => {
        selectedDifficultyRef.current = selectedDifficulty;
    }, [selectedDifficulty]);

    // Use true randomness for regular play, seeded random only for challenge mode
    const gameRandom = () => isChallenge ? seededRandomRef.current() : Math.random();
    const gameRandomRange = (min, max) => gameRandom() * (max - min) + min;

    const createParticles = (x, y, color, count = 10) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: CONFIG.PARTICLE_LIFE, color });
        }
    };

    const resetGame = useCallback(() => {
        const levelKey = isDifficultyLocked ? challengeDifficulty.current : selectedDifficultyRef.current;
        const difficultyRuntime = createDifficultyRuntime(levelKey);
        currentSeedRef.current = isChallenge ? challengeSeed.current : generateSeed();
        seededRandomRef.current = createSeededRandom(currentSeedRef.current);
        scoreRef.current = 0;
        birdRef.current = {
            y: CONFIG.INTERNAL_HEIGHT / 2, x: 100,
            velocity: 0, radius: CONFIG.BIRD_SIZE / 2,
            shieldActive: false, shieldTimer: 0, speedBoostTimer: 0, shrinkTimer: 0, sanctionSlowTimer: 0, propAngle: 0,
        };
        pipesRef.current = []; powerupsRef.current = []; particlesRef.current = [];
        touchRipplesRef.current = []; missilesRef.current = []; piratesRef.current = [];
        trumpQuoteRef.current = { text: '', timer: 0 };
        frameCountRef.current = 0;
        difficultyRef.current = difficultyRuntime;
        progressionRef.current = { tier: 0, barrelCooldown: 240, empMaxCharge: 5, powerupBonus: 0, shieldBonusFrames: 0 };
        milestoneToastRef.current = { title: '', detail: '', timer: 0 };
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
        setScore(0); setShowShareModal(false); setCopied(false); setGameState('START');
    }, [isChallenge, isDifficultyLocked]);

    const startGame = useCallback(() => {
        if (!factionRef.current) return;
        resetGame();
        if (!isChallenge) { currentSeedRef.current = generateSeed(); seededRandomRef.current = createSeededRandom(currentSeedRef.current); }
        // Start background music
        if (bgmRef.current) { bgmRef.current.currentTime = 0; bgmRef.current.volume = 0.3; bgmRef.current.play().catch(() => { }); }
        trackGameStart('Strait of Chaos');
        setGameState('PLAYING');
    }, [resetGame, isChallenge]);

    const flap = useCallback(() => {
        const bird = birdRef.current;
        const f = factionRef.current || FACTIONS.USA;
        bird.velocity = difficultyRef.current.profile.flapStrength;
        createParticles(bird.x, bird.y, f.color, 5);
    }, []);

    const triggerBarrelRoll = useCallback(() => {
        const br = barrelRollRef.current;
        if (br.cooldown > 0 || br.active) return;
        br.active = true;
        br.timer = 24; // ~0.4 seconds at 60fps
        br.cooldown = progressionRef.current.barrelCooldown;
        br.angle = 0;
        createParticles(birdRef.current.x, birdRef.current.y, '#00FFFF', 10);
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
    }, []);

    const addTouchRipple = (cx, cy) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        touchRipplesRef.current.push({
            x: (cx - rect.left) * (CONFIG.INTERNAL_WIDTH / rect.width),
            y: (cy - rect.top) * (CONFIG.INTERNAL_HEIGHT / rect.height),
            radius: 0, maxRadius: 40, life: 20,
        });
    };

    const POWERUP_TYPES = {
        OIL: { color: '#F59E0B', char: '🛢️', label: 'Oil Barrel' },
        PEACE: { color: '#FFFFFF', char: '🏳️', label: 'Peace Treaty' },
        UN: { color: '#3B82F6', char: '🇺🇳', label: 'UN Resolution' },
    };

    const activatePowerup = (type) => {
        if (type === 'PEACE') { birdRef.current.shieldActive = true; birdRef.current.shieldTimer = 300 + progressionRef.current.shieldBonusFrames; }
        if (type === 'OIL') birdRef.current.speedBoostTimer = 180;
        if (type === 'UN') birdRef.current.shrinkTimer = 300;
    };

    const gameOver = useCallback(() => {
        setGameState('GAMEOVER');
        const fs = scoreRef.current;
        const levelKey = difficultyRef.current.level || selectedDifficultyRef.current;
        setScore(fs);
        trackGameEnd('Strait of Chaos', fs);
        setHighScores(prev => {
            const currentBest = getDifficultyHighScore(prev, levelKey);
            if (fs <= currentBest) return prev;
            const next = { ...prev, [levelKey]: fs };
            localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
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
            text: TRUMP_QUOTES[Math.floor(Math.random() * TRUMP_QUOTES.length)],
            timer: 180,
        };
    }, []);

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
        const bird = birdRef.current;
        const difficulty = difficultyRef.current;
        const profile = difficulty.profile;

        if (frameCountRef.current % CONFIG.DIFFICULTY_INTERVAL === 0) {
            difficulty.speed = Math.min(difficulty.speed + difficulty.speedInc, difficulty.maxSpeed);
            difficulty.spawnRate = Math.max(difficulty.spawnRate - difficulty.spawnStep, difficulty.minSpawnRate);
            difficulty.gapSize = Math.max(difficulty.gapSize - difficulty.gapStep, difficulty.minGapSize);
        }

        let currentSpeed = bird.speedBoostTimer > 0 ? difficulty.speed * 1.5 : difficulty.speed;
        if (bird.sanctionSlowTimer > 0) { currentSpeed *= 0.5; bird.sanctionSlowTimer--; }

        bird.velocity += profile.gravity;
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
            } else { gameOver(); return; }
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
            const missileGapBonus = missilesRef.current.length > 0 ? CONFIG.MISSILE_GAP_BONUS : 0;
            const gap = difficulty.gapSize + missileGapBonus;
            const topH = gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - gap - 50);
            const pipeCount = pipesRef.current.filter(p => p.passed).length + pipesRef.current.length;
            const isSanction = (pipeCount + 1) % profile.sanctionEvery === 0;

            // Pick pattern based on score (more variety at all scores)
            const roll = gameRandom();
            const sc = scoreRef.current;
            let pattern = 'normal';
            if (sc >= 10 && roll < 0.15) pattern = 'moving';
            else if (sc >= 7 && roll < 0.28) pattern = 'staggered';
            else if (sc >= 2 && roll < 0.42) pattern = 'one_sided';
            else if (roll < 0.58) pattern = 'narrow';
            else if (roll < 0.75) pattern = 'wide';

            const pipeW = pattern === 'narrow' ? 35 : pattern === 'wide' ? 70 : 50;
            const pipeGap = pattern === 'narrow' ? gap + 20 : gap;
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
                const topH2 = gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - gap - 50);
                pipesRef.current.push({
                    x: CONFIG.INTERNAL_WIDTH + 80, topHeight: topH2, bottomY: topH2 + gap,
                    width: 50, passed: false, isSanction: false, pattern: 'normal',
                    movingDir: 0, movingSpeed: 0, oneSide: null,
                });
            }

            const powerupChance = Math.min(0.75, profile.powerupChance + progressionRef.current.powerupBonus);
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
                    gameOver(); return;
                }
            }

            if (!pipe.passed && bL > pR) {
                pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current);
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
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }
        for (let i = touchRipplesRef.current.length - 1; i >= 0; i--) {
            const r = touchRipplesRef.current[i]; r.radius += 2; r.life--;
            if (r.life <= 0) touchRipplesRef.current.splice(i, 1);
        }

        // News ticker scroll
        newsOffsetRef.current += 0.8;

        // Spawn homing missiles (after score 3, every ~400 frames, with warning)
        if (scoreRef.current >= profile.missileStartScore && frameCountRef.current % profile.missileSpawnEvery === 0) {
            const side = gameRandom() > 0.5 ? 'right' : 'top';
            missilesRef.current.push({
                x: side === 'right' ? CONFIG.INTERNAL_WIDTH + 20 : gameRandomRange(100, CONFIG.INTERNAL_WIDTH - 50),
                y: side === 'top' ? -20 : gameRandomRange(50, CONFIG.INTERNAL_HEIGHT - 50),
                vx: 0, vy: 0, speed: 1.0 + scoreRef.current * 0.04,
                life: 300, age: 0, trackingLife: 120, // stops homing after 120 frames (~2 sec)
                trail: [], warning: 60, // 60 frames of warning before active
            });
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
                    missilesRef.current.splice(i, 1); continue;
                } else if (bird.shieldActive) {
                    // Shield BREAKS through missiles without being consumed!
                    createParticles(m.x, m.y, '#FF4444', 15);
                    createParticles(m.x, m.y, '#FFFFFF', 8);
                    missilesRef.current.splice(i, 1); continue;
                } else { gameOver(); return; }
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
                missilesRef.current.splice(i, 1); continue;
            }

            if (m.life <= 0 || m.x < -50 || m.x > CONFIG.INTERNAL_WIDTH + 50 || m.y < -50 || m.y > CONFIG.INTERNAL_HEIGHT + 50) {
                createParticles(m.x, m.y, '#FF6600', 8);
                missilesDodgedRef.current++;
                missilesRef.current.splice(i, 1);
            }
        }

        // Spawn pirates (after score 7, every ~400 frames)
        if (scoreRef.current >= profile.pirateStartScore && frameCountRef.current % profile.pirateSpawnEvery === 0) {
            piratesRef.current.push({
                x: CONFIG.INTERNAL_WIDTH + 40,
                y: gameRandomRange(80, CONFIG.INTERNAL_HEIGHT - 80),
                baseY: 0, speed: 0.6 + gameRandom() * 0.4,
                bobOffset: gameRandom() * Math.PI * 2,
                width: 50, height: 30,
            });
            piratesRef.current[piratesRef.current.length - 1].baseY = piratesRef.current[piratesRef.current.length - 1].y;
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
                    piratesRef.current.splice(i, 1); continue;
                } else if (bird.shieldActive) {
                    // Shield BREAKS through pirates without being consumed!
                    createParticles(p.x, p.y, '#8B4513', 15);
                    createParticles(p.x, p.y, '#FFFFFF', 8);
                    piratesRef.current.splice(i, 1); continue;
                } else { gameOver(); return; }
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
    }, [applyMilestoneUpgrades, gameOver]);

    // --- DRAW ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = CONFIG.INTERNAL_WIDTH, H = CONFIG.INTERNAL_HEIGHT;
        const phase = getEscalationPhase(scoreRef.current);
        const f = factionRef.current || FACTIONS.USA;

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
                ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, pipe.width, pipe.topHeight); ctx.restore();
                ctx.save(); ctx.translate(pipe.x, pipe.bottomY);
                ctx.fillStyle = pat; ctx.fillRect(0, 0, pipe.width, H - pipe.bottomY);
                ctx.fillStyle = '#111'; ctx.fillRect(0, 0, pipe.width, 8);
                ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, pipe.width, H - pipe.bottomY); ctx.restore();
            } else {
                ctx.shadowBlur = 10; ctx.shadowColor = '#EF4444';
                ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 3; ctx.fillStyle = '#1A1A1A';
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
        const tilt = Math.max(-0.3, Math.min(0.3, bird.velocity * 0.05));
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
                if (Math.floor(m.warning / 6) % 2 === 0) {
                    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#FF0000';
                    ctx.fillText('⚠️', m.x, m.y);
                    ctx.shadowBlur = 20; ctx.shadowColor = '#FF0000';
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
            const flameLen = isTracking ? -12 - Math.random() * 4 : -8 - Math.random() * 2;
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
            if (Math.random() < 0.02) {
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
            for (let j = 0; j < Math.floor(intensity * 4); j++) {
                ctx.globalAlpha = 0.4 + Math.random() * 0.4;
                ctx.fillStyle = ['#FF4400', '#FF8800', '#FFCC00'][Math.floor(Math.random() * 3)];
                ctx.beginPath();
                ctx.arc(bird.x - 15 - Math.random() * 20, bird.y + (Math.random() - 0.5) * 12, 2 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
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
            const scale = 1 + (1 - ct.timer / 60) * 0.3;
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
            ctx.shadowBlur = 8; ctx.shadowColor = '#FFD700';
            ctx.fillText('💀 CLOSE CALL!', nm.x, nm.y - (40 - nm.timer));
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
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameStateRef.current === 'START' && factionRef.current) startGame();
                else if (gameStateRef.current === 'PLAYING') flap();
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
    }, [startGame, flap, triggerBarrelRoll, triggerEMP]);

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

    const getShareUrl = () => {
        const base = window.location.origin + window.location.pathname;
        const levelKey = difficultyRef.current.level || selectedDifficultyRef.current;
        return `${base}?seed=${currentSeedRef.current}&score=${scoreRef.current}&difficulty=${levelKey.toLowerCase()}`;
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
    const scoreTier = Math.min(MILESTONE_UPGRADES.length, Math.floor(score / 10));
    const nextMilestoneDelta = scoreTier >= MILESTONE_UPGRADES.length ? 0 : (10 - (score % 10));
    const phase = getEscalationPhase(score);

    return (
        <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', position: 'relative', touchAction: 'none', userSelect: 'none' }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;600&family=Black+Ops+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
        .soc-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 4px; text-align: center; }
        .soc-stat-val { font-family: 'Orbitron', monospace; font-weight: 700; font-size: 18px; color: #fff; }
        .soc-stat-lbl { font-family: 'Inter', sans-serif; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        
        /* CRT Scanline Overlay */
        .soc-crt { position: absolute; inset: 0; pointer-events: none; z-index: 5; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02)); background-size: 100% 3px, 3px 100%; opacity: 0.5; }
        .soc-run-hud { position: absolute; top: 10px; right: 10px; z-index: 21; background: rgba(0,0,0,0.55); border: 1px solid rgba(147,197,253,0.45); border-radius: 10px; padding: 6px 8px; pointer-events: none; text-align: right; max-width: 190px; }
        .soc-run-level { font-family: 'Orbitron', monospace; color: #BAE6FD; font-size: clamp(9px,2vw,11px); letter-spacing: 0.4px; font-weight: 700; text-transform: uppercase; }
        .soc-run-upgrade { font-family: 'Inter', sans-serif; color: #CBD5E1; font-size: clamp(8px,1.8vw,10px); margin-top: 1px; }
      `}</style>

            <div className="soc-wrap">
                <div className="soc-crt" />
                <canvas ref={canvasRef} width={CONFIG.INTERNAL_WIDTH} height={CONFIG.INTERNAL_HEIGHT}
                    onClick={handleCanvasInteraction} onTouchStart={handleCanvasInteraction} onTouchEnd={handleTouchEnd} />

                {/* Sound Toggle */}
                <div className="soc-sound-btn" onClick={(e) => { e.stopPropagation(); setSoundEnabled(v => !v); }}>
                    {soundEnabled ? '🔊' : '🔇'}
                </div>

                {gameState === 'PLAYING' && <div className="soc-score">{score}</div>}
                {gameState === 'PLAYING' && (
                    <div className="soc-run-hud">
                        <div className="soc-run-level">{difficultyProfile.label} Level</div>
                        <div className="soc-run-upgrade">
                            {scoreTier >= MILESTONE_UPGRADES.length ? 'All upgrades unlocked' : `Next upgrade in ${nextMilestoneDelta} towers`}
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
                                    {isChallenge ? 'Accept Challenge' : 'Begin Deployment'}
                                </button>
                                <p className="soc-tagline">Authorized personnel only beyond this point.</p>
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

                                <div className="soc-stats-grid">
                                    <div className="soc-stat">
                                        <div className="soc-stat-val" style={{ color: '#F59E0B' }}>{highScore}</div>
                                        <div className="soc-stat-lbl">Record</div>
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
