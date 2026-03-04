import React, { useState, useEffect, useRef, useCallback } from 'react';
import warzoneSkyline from './assets/warzone_skyline.png';
import missileTower from './assets/missile_tower.png';
import failSoundUrl from './assets/fahhhhh.mp3';

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

const StraitOfChaos = () => {
    const CONFIG = {
        GRAVITY: 0.06, BIRD_SIZE: 20, GAME_SPEED_START: 0.8, GAME_SPEED_MAX: 1.8,
        SPAWN_RATE_START: 240, GAP_SIZE_START: 180, GAP_SIZE_MIN: 140,
        INTERNAL_WIDTH: 800, INTERNAL_HEIGHT: 600, PARTICLE_LIFE: 30,
        POWERUP_SIZE: 25, DIFFICULTY_INTERVAL: 900, DIFFICULTY_SPEED_INC: 0.3,
    };

    const FACTIONS = {
        USA: { name: 'USA', emoji: '🦅', color: '#3B82F6', alt: '#1E40AF', gravMult: 1.1, dragMult: 0.97 },
        IRAN: { name: 'IRAN', emoji: '🕊️', color: '#22C55E', alt: '#15803D', gravMult: 0.9, dragMult: 0.985 },
    };

    const getEscalationPhase = (s) => {
        if (s >= 25) return { name: 'FULL CHAOS', skyTop: '#1A0000', skyBot: '#4A0000', glow: '#FF0000', tint: 'rgba(255,0,0,0.08)' };
        if (s >= 15) return { name: 'CONFLICT', skyTop: '#1A0A00', skyBot: '#3D1500', glow: '#FF4400', tint: 'rgba(255,68,0,0.05)' };
        if (s >= 5) return { name: 'ESCALATION', skyTop: '#1A1000', skyBot: '#3D2800', glow: '#FF8800', tint: 'rgba(255,136,0,0.03)' };
        return { name: 'TENSE CALM', skyTop: '#0A0F1A', skyBot: '#1A2A3D', glow: '#FFaa44', tint: 'rgba(0,0,0,0)' };
    };

    const urlParams = useRef(new URLSearchParams(window.location.search));
    const challengeSeed = useRef(urlParams.current.has('seed') ? parseInt(urlParams.current.get('seed'), 10) : null);
    const challengeScore = useRef(urlParams.current.has('score') ? parseInt(urlParams.current.get('score'), 10) : null);
    const isChallenge = challengeSeed.current !== null;

    const [gameState, setGameState] = useState('START');
    const [score, setScore] = useState(0);
    const [faction, setFaction] = useState(null);
    const [highScore, setHighScore] = useState(() => {
        const s = localStorage.getItem('straitChaosHighScore');
        return s ? parseInt(s, 10) : 0;
    });
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

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

    const birdRef = useRef({
        y: CONFIG.INTERNAL_HEIGHT / 2, x: CONFIG.INTERNAL_WIDTH / 3,
        velocity: 0, gravityDirection: 1, radius: CONFIG.BIRD_SIZE / 2,
        shieldActive: false, speedBoostTimer: 0, shrinkTimer: 0, sanctionSlowTimer: 0,
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
    const difficultyRef = useRef({ speed: CONFIG.GAME_SPEED_START, spawnRate: CONFIG.SPAWN_RATE_START, gapSize: CONFIG.GAP_SIZE_START });
    const bgImageRef = useRef(null);
    const towerImageRef = useRef(null);

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
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [updateCanvasSize]);

    useEffect(() => {
        const bg = new Image(); bg.src = warzoneSkyline; bg.onload = () => { bgImageRef.current = bg; };
        const tw = new Image(); tw.src = missileTower; tw.onload = () => { towerImageRef.current = tw; };
        failSoundRef.current = new Audio(failSoundUrl);
        failSoundRef.current.volume = 0.7;
    }, []);

    const seededRandomRange = (min, max) => seededRandomRef.current() * (max - min) + min;

    const createParticles = (x, y, color, count = 10) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: CONFIG.PARTICLE_LIFE, color });
        }
    };

    const resetGame = useCallback(() => {
        currentSeedRef.current = isChallenge ? challengeSeed.current : generateSeed();
        seededRandomRef.current = createSeededRandom(currentSeedRef.current);
        scoreRef.current = 0;
        birdRef.current = {
            y: CONFIG.INTERNAL_HEIGHT / 2, x: CONFIG.INTERNAL_WIDTH / 3,
            velocity: 0, gravityDirection: 1, radius: CONFIG.BIRD_SIZE / 2,
            shieldActive: false, speedBoostTimer: 0, shrinkTimer: 0, sanctionSlowTimer: 0, propAngle: 0,
        };
        pipesRef.current = []; powerupsRef.current = []; particlesRef.current = [];
        touchRipplesRef.current = []; missilesRef.current = []; piratesRef.current = [];
        trumpQuoteRef.current = { text: '', timer: 0 };
        frameCountRef.current = 0;
        difficultyRef.current = { speed: CONFIG.GAME_SPEED_START, spawnRate: CONFIG.SPAWN_RATE_START, gapSize: CONFIG.GAP_SIZE_START };
        newsOffsetRef.current = 0;
        activeHeadlinesRef.current = [NEWS_HEADLINES[0], NEWS_HEADLINES[1], NEWS_HEADLINES[2]];
        lastHeadlineIdxRef.current = 2;
        setScore(0); setShowShareModal(false); setCopied(false); setGameState('START');
    }, [isChallenge]);

    const startGame = useCallback(() => {
        if (!factionRef.current) return;
        resetGame();
        if (!isChallenge) { currentSeedRef.current = generateSeed(); seededRandomRef.current = createSeededRandom(currentSeedRef.current); }
        setGameState('PLAYING');
    }, [resetGame, isChallenge]);

    const flipGravity = useCallback(() => {
        const bird = birdRef.current;
        const f = factionRef.current || FACTIONS.USA;
        bird.gravityDirection *= -1;
        bird.velocity = 0;
        createParticles(bird.x, bird.y, f.color, 5);
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
        if (type === 'PEACE') birdRef.current.shieldActive = true;
        if (type === 'OIL') birdRef.current.speedBoostTimer = 180;
        if (type === 'UN') birdRef.current.shrinkTimer = 300;
    };

    const gameOver = useCallback(() => {
        setGameState('GAMEOVER');
        const fs = scoreRef.current;
        setScore(fs);
        if (fs > highScore) { setHighScore(fs); localStorage.setItem('straitChaosHighScore', String(fs)); }
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
    }, [highScore]);

    // --- UPDATE ---
    const update = useCallback(() => {
        frameCountRef.current++;
        const bird = birdRef.current;
        const f = factionRef.current || FACTIONS.USA;

        if (frameCountRef.current % CONFIG.DIFFICULTY_INTERVAL === 0) {
            difficultyRef.current.speed = Math.min(difficultyRef.current.speed + CONFIG.DIFFICULTY_SPEED_INC, CONFIG.GAME_SPEED_MAX);
            difficultyRef.current.spawnRate = Math.max(difficultyRef.current.spawnRate - 5, 60);
            difficultyRef.current.gapSize = Math.max(difficultyRef.current.gapSize - 2, CONFIG.GAP_SIZE_MIN);
        }

        let currentSpeed = bird.speedBoostTimer > 0 ? difficultyRef.current.speed * 1.5 : difficultyRef.current.speed;
        if (bird.sanctionSlowTimer > 0) { currentSpeed *= 0.5; bird.sanctionSlowTimer--; }

        bird.velocity += CONFIG.GRAVITY * bird.gravityDirection * f.gravMult;
        bird.velocity *= f.dragMult;
        bird.y += bird.velocity;
        bird.propAngle += 0.3;

        const hitTop = bird.y - bird.radius < 0;
        const hitBottom = bird.y + bird.radius > CONFIG.INTERNAL_HEIGHT;
        if (hitTop || hitBottom) {
            if (bird.shieldActive) {
                bird.shieldActive = false; bird.velocity *= -0.5;
                bird.y = hitTop ? bird.radius + 1 : CONFIG.INTERNAL_HEIGHT - bird.radius - 1;
                createParticles(bird.x, bird.y, '#FFFFFF', 15);
            } else { gameOver(); return; }
        }

        if (bird.speedBoostTimer > 0) bird.speedBoostTimer--;
        if (bird.shrinkTimer > 0) { bird.shrinkTimer--; bird.radius = (CONFIG.BIRD_SIZE / 2) * 0.6; }
        else bird.radius = CONFIG.BIRD_SIZE / 2;

        // Spawn pipes
        if (frameCountRef.current % Math.round(difficultyRef.current.spawnRate) === 0) {
            const gap = difficultyRef.current.gapSize;
            const topH = seededRandomRange(50, CONFIG.INTERNAL_HEIGHT - gap - 50);
            const pipeCount = pipesRef.current.filter(p => p.passed).length + pipesRef.current.length;
            const isSanction = (pipeCount + 1) % 5 === 0;

            pipesRef.current.push({ x: CONFIG.INTERNAL_WIDTH, topHeight: topH, bottomY: topH + gap, width: 60, passed: false, isSanction });

            if (seededRandomRef.current() < 0.35) {
                const types = ['PEACE', 'OIL', 'UN'];
                const type = types[Math.floor(seededRandomRef.current() * types.length)];
                const py = topH + gap / 2;
                powerupsRef.current.push({ x: CONFIG.INTERNAL_WIDTH + 30, y: py, type, active: true, baseY: py, offset: seededRandomRef.current() * Math.PI * 2 });
            }
        }

        // Update pipes
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
            const pipe = pipesRef.current[i];
            pipe.x -= currentSpeed;
            const bL = bird.x - bird.radius, bR = bird.x + bird.radius, bT = bird.y - bird.radius, bB = bird.y + bird.radius;
            const pL = pipe.x, pR = pipe.x + pipe.width;
            const hitT = bR > pL && bL < pR && bT < pipe.topHeight;
            const hitB = bR > pL && bL < pR && bB > pipe.bottomY;

            if (hitT || hitB) {
                if (pipe.isSanction) {
                    bird.sanctionSlowTimer = 90;
                    createParticles(bird.x, bird.y, '#F59E0B', 8);
                    pipesRef.current.splice(i, 1);
                    if (!pipe.passed) { pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current); }
                    // Inject score headline
                    if (SCORE_HEADLINES[scoreRef.current]) {
                        activeHeadlinesRef.current.push(SCORE_HEADLINES[scoreRef.current]);
                    }
                    continue;
                }
                if (bird.shieldActive) {
                    bird.shieldActive = false; pipesRef.current.splice(i, 1);
                    createParticles(bird.x, bird.y, '#FFFFFF', 20); continue;
                }
                gameOver(); return;
            }

            if (!pipe.passed && bL > pR) {
                pipe.passed = true; scoreRef.current += 1; setScore(scoreRef.current);
                if (SCORE_HEADLINES[scoreRef.current]) activeHeadlinesRef.current.push(SCORE_HEADLINES[scoreRef.current]);
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

        // Spawn homing missiles (after score 3, every ~300 frames)
        if (scoreRef.current >= 3 && frameCountRef.current % 280 === 0) {
            const side = seededRandomRef.current() > 0.5 ? 'right' : 'top';
            missilesRef.current.push({
                x: side === 'right' ? CONFIG.INTERNAL_WIDTH + 20 : seededRandomRange(200, CONFIG.INTERNAL_WIDTH - 100),
                y: side === 'top' ? -20 : seededRandomRange(50, CONFIG.INTERNAL_HEIGHT - 50),
                vx: 0, vy: 0, speed: 1.2 + scoreRef.current * 0.05,
                life: 360, trail: [],
            });
        }

        // Update missiles (homing)
        for (let i = missilesRef.current.length - 1; i >= 0; i--) {
            const m = missilesRef.current[i];
            const dx = bird.x - m.x, dy = bird.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ax = (dx / dist) * m.speed * 0.08, ay = (dy / dist) * m.speed * 0.08;
            m.vx += ax; m.vy += ay;
            const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            if (spd > m.speed) { m.vx = (m.vx / spd) * m.speed; m.vy = (m.vy / spd) * m.speed; }
            m.x += m.vx; m.y += m.vy; m.life--;
            m.trail.push({ x: m.x, y: m.y, life: 15 });
            if (m.trail.length > 12) m.trail.shift();
            m.trail.forEach(t => t.life--);
            // Collision with bird
            if (dist < bird.radius + 8) {
                if (bird.shieldActive) {
                    bird.shieldActive = false;
                    createParticles(m.x, m.y, '#FF4444', 15);
                    missilesRef.current.splice(i, 1); continue;
                } else { gameOver(); return; }
            }
            if (m.life <= 0 || m.x < -50 || m.x > CONFIG.INTERNAL_WIDTH + 50 || m.y < -50 || m.y > CONFIG.INTERNAL_HEIGHT + 50) {
                createParticles(m.x, m.y, '#FF6600', 8);
                missilesRef.current.splice(i, 1);
            }
        }

        // Spawn pirates (after score 7, every ~400 frames)
        if (scoreRef.current >= 7 && frameCountRef.current % 380 === 0) {
            piratesRef.current.push({
                x: CONFIG.INTERNAL_WIDTH + 40,
                y: seededRandomRange(80, CONFIG.INTERNAL_HEIGHT - 80),
                baseY: 0, speed: 0.6 + seededRandomRef.current() * 0.4,
                bobOffset: seededRandomRef.current() * Math.PI * 2,
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
                if (bird.shieldActive) {
                    bird.shieldActive = false;
                    createParticles(p.x, p.y, '#8B4513', 15);
                    piratesRef.current.splice(i, 1); continue;
                } else { gameOver(); return; }
            }
            if (p.x < -60) piratesRef.current.splice(i, 1);
        }

        // Trump quote timer
        if (trumpQuoteRef.current.timer > 0) trumpQuoteRef.current.timer--;
    }, [gameOver]);

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

        // Gravity arrow
        const arrowY = bird.gravityDirection * (bird.radius + 14);
        ctx.fillStyle = f.color; ctx.beginPath();
        if (bird.gravityDirection === 1) {
            ctx.moveTo(-5, arrowY - 5); ctx.lineTo(5, arrowY - 5); ctx.lineTo(0, arrowY + 5);
        } else {
            ctx.moveTo(-5, arrowY + 5); ctx.lineTo(5, arrowY + 5); ctx.lineTo(0, arrowY - 5);
        }
        ctx.fill(); ctx.restore();

        // --- HOMING MISSILES ---
        missilesRef.current.forEach(m => {
            // Trail
            m.trail.forEach(t => {
                ctx.globalAlpha = t.life / 15 * 0.5;
                ctx.fillStyle = '#FF4400';
                ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            // Missile body
            const angle = Math.atan2(m.vy, m.vx);
            ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(angle);
            ctx.fillStyle = '#CC0000';
            ctx.beginPath();
            ctx.moveTo(10, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4);
            ctx.closePath(); ctx.fill();
            // Fins
            ctx.fillStyle = '#880000';
            ctx.fillRect(-8, -5, 3, 2); ctx.fillRect(-8, 3, 3, 2);
            // Flame
            ctx.fillStyle = '#FF8800';
            ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-12 - Math.random() * 4, 0); ctx.lineTo(-6, 2); ctx.fill();
            ctx.restore();
            // Warning indicator
            ctx.shadowBlur = 8; ctx.shadowColor = '#FF0000';
            ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 1;
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

        // Trump quote overlay
        if (trumpQuoteRef.current.timer > 0) {
            const qt = trumpQuoteRef.current;
            const alpha = Math.min(1, qt.timer / 30);
            ctx.globalAlpha = alpha;
            // Background box
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const qw = 380, qh = 60;
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
                else if (gameStateRef.current === 'PLAYING') flipGravity();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [startGame, flipGravity]);

    const handleCanvasInteraction = (e) => {
        e.preventDefault();
        if (gameState === 'PLAYING') {
            flipGravity();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            addTouchRipple(cx, cy);
        }
    };

    const selectFaction = (key) => { setFaction(key); factionRef.current = FACTIONS[key]; };

    const getShareUrl = () => {
        const base = window.location.origin + window.location.pathname;
        return `${base}?seed=${currentSeedRef.current}&score=${scoreRef.current}`;
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
    const phase = getEscalationPhase(score);

    return (
        <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', position: 'relative', touchAction: 'manipulation', userSelect: 'none' }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;600&family=Black+Ops+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .soc-wrap { position: relative; width: ${canvasSize.width}px; height: ${canvasSize.height}px; border: 2px solid rgba(239,68,68,0.4); box-shadow: 0 0 30px rgba(239,68,68,0.2), inset 0 0 30px rgba(0,0,0,0.5); border-radius: 12px; overflow: hidden; }
        .soc-wrap canvas { display: block; width: 100%; height: 100%; touch-action: manipulation; }
        .soc-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
        .soc-score { position: absolute; top: clamp(8px,3vw,24px); left: 0; right: 0; text-align: center; font-family: 'Orbitron', monospace; font-size: clamp(24px,6vw,48px); font-weight: 900; color: #fff; text-shadow: 0 0 15px ${phase.glow}; z-index: 10; letter-spacing: 2px; }
        .soc-screen { pointer-events: auto; background: rgba(10,10,20,0.94); backdrop-filter: blur(12px); border: 1px solid rgba(239,68,68,0.4); border-radius: clamp(12px,3vw,24px); padding: clamp(16px,4vw,40px) clamp(14px,3.5vw,36px); text-align: center; max-width: 90%; width: clamp(300px,82vw,440px); box-shadow: 0 0 40px rgba(239,68,68,0.15), 0 0 80px rgba(245,158,11,0.08); animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .soc-screen h1 { font-family: 'Black Ops One', monospace; font-size: clamp(20px,5.5vw,36px); color: #EF4444; text-shadow: 0 0 20px rgba(239,68,68,0.6), 0 2px 4px rgba(0,0,0,0.5); margin-bottom: clamp(4px,1.5vw,12px); text-transform: uppercase; letter-spacing: clamp(1px,0.4vw,3px); line-height: 1.2; }
        .soc-screen p { font-family: 'Inter', sans-serif; color: #a0a0c0; font-size: clamp(11px,2.8vw,15px); margin-bottom: clamp(4px,1.2vw,10px); line-height: 1.5; }
        .soc-screen .hl { color: #F59E0B; font-weight: 700; }
        .soc-btn { display: inline-block; font-family: 'Orbitron', monospace; font-weight: 700; font-size: clamp(12px,3.2vw,16px); padding: clamp(10px,2.5vw,16px) clamp(20px,5vw,40px); border: none; border-radius: 50px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: transform 0.15s, box-shadow 0.15s; min-height: 44px; -webkit-tap-highlight-color: transparent; }
        .soc-btn:active { transform: scale(0.95) !important; }
        .soc-btn-play { background: linear-gradient(135deg, #EF4444, #B91C1C); color: #fff; box-shadow: 0 0 20px rgba(239,68,68,0.4); }
        .soc-btn-play:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(239,68,68,0.6); }
        .soc-btn-share { background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; box-shadow: 0 0 20px rgba(245,158,11,0.3); }
        .soc-btn-share:hover { transform: scale(1.05); }
        .soc-btn-sec { background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
        .soc-btn-sec:hover { background: rgba(239,68,68,0.2); }
        .soc-faction-row { display: flex; gap: clamp(8px,2vw,16px); justify-content: center; margin: clamp(8px,2vw,14px) 0; }
        .soc-faction { padding: clamp(10px,2.5vw,16px) clamp(14px,3vw,24px); border-radius: 14px; border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.2s; text-align: center; flex: 1; max-width: 160px; }
        .soc-faction:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); }
        .soc-faction.active-usa { border-color: #3B82F6; background: rgba(59,130,246,0.15); box-shadow: 0 0 20px rgba(59,130,246,0.2); }
        .soc-faction.active-iran { border-color: #22C55E; background: rgba(34,197,94,0.15); box-shadow: 0 0 20px rgba(34,197,94,0.2); }
        .soc-faction-emoji { font-size: clamp(24px,6vw,40px); display: block; margin-bottom: 4px; }
        .soc-faction-name { font-family: 'Orbitron', monospace; font-size: clamp(11px,2.8vw,14px); font-weight: 700; color: #fff; }
        .soc-faction-desc { font-family: 'Inter', sans-serif; font-size: clamp(9px,2vw,11px); color: #888; margin-top: 2px; }
        .soc-btn-row { display: flex; flex-direction: column; gap: clamp(8px,2vw,12px); margin-top: clamp(8px,2vw,14px); align-items: center; }
        .soc-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent); margin: clamp(6px,1.5vw,12px) 0; }
        .soc-label { font-family: 'Inter', sans-serif; font-size: clamp(9px,2.2vw,12px); color: #666; text-transform: uppercase; letter-spacing: 2px; }
        .soc-score-big { font-family: 'Orbitron', monospace; font-size: clamp(32px,9vw,56px); font-weight: 900; color: #fff; text-shadow: 0 0 20px ${phase.glow}; margin: clamp(2px,0.8vw,6px) 0; }
        .soc-result { font-family: 'Orbitron', monospace; font-size: clamp(14px,3.5vw,22px); font-weight: 900; padding: clamp(6px,1.5vw,10px); border-radius: 10px; margin: clamp(6px,1.5vw,10px) 0; }
        .soc-result.win { color: #22C55E; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3); }
        .soc-result.lose { color: #EF4444; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); }
        .soc-result.tie { color: #F59E0B; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); }
        .soc-hint { animation: pulse 2.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .soc-challenge-banner { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15)); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: clamp(8px,2vw,12px); margin-bottom: clamp(8px,1.5vw,12px); }
        .soc-challenge-banner p { margin: 0; font-size: clamp(11px,2.5vw,13px); color: #EF4444; font-weight: 600; }
        .soc-challenge-banner .ts { font-family: 'Orbitron', monospace; font-size: clamp(18px,5vw,28px); font-weight: 900; color: #EF4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
        .soc-tagline { font-family: 'Inter', sans-serif; font-size: clamp(9px,2.2vw,12px); color: #F59E0B; font-style: italic; letter-spacing: 0.5px; }
        @media (max-width: 480px) { .soc-wrap { border: none; border-radius: 0; } }
      `}</style>

            <div className="soc-wrap">
                <canvas ref={canvasRef} width={CONFIG.INTERNAL_WIDTH} height={CONFIG.INTERNAL_HEIGHT}
                    onClick={handleCanvasInteraction} onTouchStart={handleCanvasInteraction} />

                {gameState === 'PLAYING' && <div className="soc-score">{score}</div>}

                {gameState === 'START' && (
                    <div className="soc-overlay">
                        <div className="soc-screen" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
                            <h1>Strait of Chaos</h1>
                            <p className="soc-tagline">Navigate the world's most dangerous strait. Diplomacy is dead.</p>

                            {isChallenge && challengeScore.current !== null && (
                                <div className="soc-challenge-banner">
                                    <p>🎯 Diplomatic Challenge</p>
                                    <p>Beat this score:</p>
                                    <div className="ts">{challengeScore.current}</div>
                                </div>
                            )}

                            <p style={{ marginTop: '8px' }}>Choose your <span className="hl">faction</span></p>
                            <div className="soc-faction-row">
                                <div className={`soc-faction ${faction === 'USA' ? 'active-usa' : ''}`} onClick={() => selectFaction('USA')}>
                                    <span className="soc-faction-emoji">🦅</span>
                                    <div className="soc-faction-name">USA</div>
                                    <div className="soc-faction-desc">Heavy & Powerful</div>
                                </div>
                                <div className={`soc-faction ${faction === 'IRAN' ? 'active-iran' : ''}`} onClick={() => selectFaction('IRAN')}>
                                    <span className="soc-faction-emoji">🕊️</span>
                                    <div className="soc-faction-name">IRAN</div>
                                    <div className="soc-faction-desc">Light & Agile</div>
                                </div>
                            </div>

                            <div className="soc-divider" />

                            {/* HOW TO PLAY TUTORIAL */}
                            <div style={{ textAlign: 'left', padding: '0 4px' }}>
                                <p style={{ color: '#EF4444', fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', marginBottom: '8px', textAlign: 'center' }}>🎮 HOW TO PLAY</p>

                                <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', marginBottom: '6px' }}>
                                    <span className="hl">SPACE</span> or <span className="hl">TAP</span> to flip gravity — your drone switches between falling down and floating up.
                                </p>

                                <p style={{ color: '#EF4444', fontWeight: 700, fontSize: 'clamp(11px,2.8vw,14px)', marginBottom: '4px', marginTop: '10px' }}>⚠️ THREATS</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '4px 8px', fontSize: 'clamp(9px,2.2vw,12px)', marginBottom: '8px' }}>
                                    <span>🏢</span><span style={{ color: '#ccc' }}><strong style={{ color: '#EF4444' }}>Missile Towers</strong> — dodge between them or die</span>
                                    <span>💰</span><span style={{ color: '#ccc' }}><strong style={{ color: '#F59E0B' }}>Sanctions Barriers</strong> — golden walls that slow you (survivable!)</span>
                                    <span>🚀</span><span style={{ color: '#ccc' }}><strong style={{ color: '#FF4444' }}>Homing Missiles</strong> — chase your drone! Appear at score 3+</span>
                                    <span>🏴‍☠️</span><span style={{ color: '#ccc' }}><strong style={{ color: '#8B4513' }}>Pirate Ships</strong> — rogue vessels that bob around. Appear at score 7+</span>
                                </div>

                                <p style={{ color: '#3B82F6', fontWeight: 700, fontSize: 'clamp(11px,2.8vw,14px)', marginBottom: '4px' }}>✨ POWER-UPS</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '4px 8px', fontSize: 'clamp(9px,2.2vw,12px)', marginBottom: '8px' }}>
                                    <span>🛢️</span><span style={{ color: '#ccc' }}><strong style={{ color: '#F59E0B' }}>Oil Barrel</strong> — speed boost for 3 seconds</span>
                                    <span>🏳️</span><span style={{ color: '#ccc' }}><strong style={{ color: '#fff' }}>Peace Treaty</strong> — shield, survives one hit</span>
                                    <span>🇺🇳</span><span style={{ color: '#ccc' }}><strong style={{ color: '#3B82F6' }}>UN Resolution</strong> — shrinks your drone to dodge easier</span>
                                </div>

                                <p style={{ color: '#FF6600', fontWeight: 700, fontSize: 'clamp(11px,2.8vw,14px)', marginBottom: '4px' }}>🔥 ESCALATION</p>
                                <p style={{ fontSize: 'clamp(9px,2.2vw,12px)', color: '#999', marginBottom: '6px' }}>
                                    As your score rises, the world escalates: <span style={{ color: '#FFaa44' }}>Tense Calm</span> → <span style={{ color: '#FF8800' }}>Escalation</span> → <span style={{ color: '#FF4400' }}>Conflict</span> → <span style={{ color: '#FF0000' }}>Full Chaos</span>. More missiles, faster speed, smaller gaps!
                                </p>
                            </div>

                            <div className="soc-divider" />

                            <p className="soc-hint" style={{ fontSize: 'clamp(10px,2.2vw,12px)' }}>🏺 Trump commentary on every failure • 📰 Live news ticker</p>

                            <div className="soc-btn-row">
                                <button className="soc-btn soc-btn-play" onClick={startGame} style={{ opacity: faction ? 1 : 0.4, pointerEvents: faction ? 'auto' : 'none' }}>
                                    {isChallenge ? '⚔️ Accept Challenge' : '▶ Deploy Drone'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="soc-overlay">
                        <div className="soc-screen">
                            <h1 style={{ color: '#EF4444' }}>Mission Failed</h1>
                            <div className="soc-label">Obstacles Cleared</div>
                            <div className="soc-score-big">{score}</div>
                            <div className="soc-divider" />
                            <div className="soc-label">Best Record</div>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(16px,4.5vw,24px)', fontWeight: 700, color: '#F59E0B', textShadow: '0 0 10px rgba(245,158,11,0.4)', marginBottom: '4px' }}>
                                {highScore}
                            </div>

                            {isChallenge && challengeScore.current !== null && (
                                <>
                                    <div className="soc-divider" />
                                    <div className="soc-label">vs Rival Nation</div>
                                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(14px,3.5vw,20px)', color: '#EF4444', margin: '4px 0' }}>
                                        {challengeScore.current}
                                    </div>
                                    <div className={`soc-result ${score > challengeScore.current ? 'win' : score < challengeScore.current ? 'lose' : 'tie'}`}>
                                        {score > challengeScore.current ? '🏆 MISSION ACCOMPLISHED!' : score < challengeScore.current ? '💀 STAND DOWN' : '🤝 CEASEFIRE!'}
                                    </div>
                                </>
                            )}

                            <div className="soc-btn-row">
                                <button className="soc-btn soc-btn-play" onClick={startGame}>↻ Redeploy</button>
                                <button className="soc-btn soc-btn-share" onClick={() => setShowShareModal(true)}>⚔️ Diplomatic Challenge</button>
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
