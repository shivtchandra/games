import React, { useState, useEffect, useRef, useCallback } from 'react';
import tokyoSkyline from './assets/tokyo_skyline.png';
import buildingTexture from './assets/building_texture.png';

// --- Seeded Random Number Generator (for Challenge Mode) ---
function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSeed() {
  return Math.floor(Math.random() * 2147483647);
}

const NeonGravityFlappy = () => {
  // --- Constants & Config ---
  const CONFIG = {
    GRAVITY: 0.06,
    BIRD_SIZE: 20,
    GAME_SPEED_START: 0.8,
    GAME_SPEED_MAX: 1.8,
    SPAWN_RATE_START: 240,
    GAP_SIZE_START: 180,
    GAP_SIZE_MIN: 140,
    INTERNAL_WIDTH: 800,
    INTERNAL_HEIGHT: 600,
    PARTICLE_LIFE: 30,
    POWERUP_SIZE: 25,
    DIFFICULTY_INTERVAL: 900,
    DIFFICULTY_SPEED_INC: 0.3,
  };

  const COLORS = {
    BG_TOP: '#0F0518',
    BG_BOTTOM: '#1A0B2E',
    BIRD_NORMAL: '#00F3FF',
    BIRD_INVERTED: '#FF0099',
    PIPE_BODY: '#090114',
    PIPE_OUTLINE: '#BB00FF',
    SHIELD: '#0044FF',
    SPEED: '#FF8800',
    SHRINK: '#00FF44',
  };

  // --- Challenge Mode: Parse URL ---
  const urlParams = useRef(new URLSearchParams(window.location.search));
  const challengeSeed = useRef(
    urlParams.current.has('seed') ? parseInt(urlParams.current.get('seed'), 10) : null
  );
  const challengeScore = useRef(
    urlParams.current.has('score') ? parseInt(urlParams.current.get('score'), 10) : null
  );
  const isChallenge = challengeSeed.current !== null;

  // --- State ---
  const [gameState, setGameState] = useState('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('neonFlappyHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // --- Refs ---
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const frameCountRef = useRef(0);
  const currentSeedRef = useRef(isChallenge ? challengeSeed.current : generateSeed());
  const seededRandomRef = useRef(createSeededRandom(currentSeedRef.current));
  const scoreRef = useRef(0);

  const birdRef = useRef({
    y: CONFIG.INTERNAL_HEIGHT / 2,
    x: CONFIG.INTERNAL_WIDTH / 3,
    velocity: 0,
    gravityDirection: 1,
    radius: CONFIG.BIRD_SIZE / 2,
    color: COLORS.BIRD_NORMAL,
    shieldActive: false,
    speedBoostTimer: 0,
    shrinkTimer: 0,
  });

  const pipesRef = useRef([]);
  const powerupsRef = useRef([]);
  const particlesRef = useRef([]);
  const touchRipplesRef = useRef([]);
  const difficultyRef = useRef({
    speed: CONFIG.GAME_SPEED_START,
    spawnRate: CONFIG.SPAWN_RATE_START,
    gapSize: CONFIG.GAP_SIZE_START,
  });

  const bgImageRef = useRef(null);
  const buildingImageRef = useRef(null);

  // --- Responsive Canvas Sizing ---
  const updateCanvasSize = useCallback(() => {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const aspect = CONFIG.INTERNAL_WIDTH / CONFIG.INTERNAL_HEIGHT;

    let w, h;
    if (maxW / maxH > aspect) {
      h = maxH;
      w = h * aspect;
    } else {
      w = maxW;
      h = w / aspect;
    }
    setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // --- Load Images ---
  useEffect(() => {
    const bgImg = new Image();
    bgImg.src = tokyoSkyline;
    bgImg.onload = () => { bgImageRef.current = bgImg; };

    const bldgImg = new Image();
    bldgImg.src = buildingTexture;
    bldgImg.onload = () => { buildingImageRef.current = bldgImg; };
  }, []);

  // --- Helpers ---
  const seededRandomRange = (min, max) => seededRandomRef.current() * (max - min) + min;

  const createParticles = (x, y, color, count = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: CONFIG.PARTICLE_LIFE,
        color,
      });
    }
  };

  const resetGame = useCallback(() => {
    currentSeedRef.current = isChallenge ? challengeSeed.current : generateSeed();
    seededRandomRef.current = createSeededRandom(currentSeedRef.current);
    scoreRef.current = 0;

    birdRef.current = {
      y: CONFIG.INTERNAL_HEIGHT / 2,
      x: CONFIG.INTERNAL_WIDTH / 3,
      velocity: 0,
      gravityDirection: 1,
      radius: CONFIG.BIRD_SIZE / 2,
      color: COLORS.BIRD_NORMAL,
      shieldActive: false,
      speedBoostTimer: 0,
      shrinkTimer: 0,
    };
    pipesRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    touchRipplesRef.current = [];
    frameCountRef.current = 0;
    difficultyRef.current = {
      speed: CONFIG.GAME_SPEED_START,
      spawnRate: CONFIG.SPAWN_RATE_START,
      gapSize: CONFIG.GAP_SIZE_START,
    };
    setScore(0);
    setShowShareModal(false);
    setCopied(false);
    setGameState('START');
  }, [isChallenge]);

  const startGame = useCallback(() => {
    resetGame();
    // Re-seed after reset so seed is fresh for non-challenge
    if (!isChallenge) {
      currentSeedRef.current = generateSeed();
      seededRandomRef.current = createSeededRandom(currentSeedRef.current);
    }
    setGameState('PLAYING');
  }, [resetGame, isChallenge]);

  const flipGravity = useCallback(() => {
    const bird = birdRef.current;
    bird.gravityDirection *= -1;
    bird.velocity = 0;
    bird.color = bird.gravityDirection === 1 ? COLORS.BIRD_NORMAL : COLORS.BIRD_INVERTED;
    createParticles(bird.x, bird.y, bird.color, 5);
  }, []);

  const addTouchRipple = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.INTERNAL_WIDTH / rect.width;
    const scaleY = CONFIG.INTERNAL_HEIGHT / rect.height;
    touchRipplesRef.current.push({
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      radius: 0,
      maxRadius: 40,
      life: 20,
    });
  };

  // --- Power-ups ---
  const getPowerupColor = (type) => {
    switch (type) {
      case 'SHIELD': return COLORS.SHIELD;
      case 'SPEED': return COLORS.SPEED;
      case 'SHRINK': return COLORS.SHRINK;
      default: return '#FFF';
    }
  };

  const activatePowerup = (type) => {
    if (type === 'SHIELD') birdRef.current.shieldActive = true;
    if (type === 'SPEED') birdRef.current.speedBoostTimer = 180;
    if (type === 'SHRINK') birdRef.current.shrinkTimer = 300;
  };

  const gameOver = useCallback(() => {
    setGameState('GAMEOVER');
    const finalScore = scoreRef.current;
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('neonFlappyHighScore', String(finalScore));
    }
  }, [highScore]);

  // --- Game Loop ---
  const update = useCallback(() => {
    frameCountRef.current++;
    const bird = birdRef.current;

    // Difficulty ramp
    if (frameCountRef.current % CONFIG.DIFFICULTY_INTERVAL === 0) {
      difficultyRef.current.speed = Math.min(difficultyRef.current.speed + CONFIG.DIFFICULTY_SPEED_INC, CONFIG.GAME_SPEED_MAX);
      difficultyRef.current.spawnRate = Math.max(difficultyRef.current.spawnRate - 5, 60);
      difficultyRef.current.gapSize = Math.max(difficultyRef.current.gapSize - 2, CONFIG.GAP_SIZE_MIN);
    }

    const currentSpeed = bird.speedBoostTimer > 0
      ? difficultyRef.current.speed * 1.5
      : difficultyRef.current.speed;

    // Bird Physics
    bird.velocity += CONFIG.GRAVITY * bird.gravityDirection;
    bird.velocity *= 0.98;
    bird.y += bird.velocity;

    const hitTop = bird.y - bird.radius < 0;
    const hitBottom = bird.y + bird.radius > CONFIG.INTERNAL_HEIGHT;

    if (hitTop || hitBottom) {
      if (bird.shieldActive) {
        bird.shieldActive = false;
        bird.velocity *= -0.5;
        bird.y = hitTop ? bird.radius + 1 : CONFIG.INTERNAL_HEIGHT - bird.radius - 1;
        createParticles(bird.x, bird.y, COLORS.SHIELD, 15);
      } else {
        gameOver();
        return;
      }
    }

    if (bird.speedBoostTimer > 0) bird.speedBoostTimer--;
    if (bird.shrinkTimer > 0) {
      bird.shrinkTimer--;
      bird.radius = (CONFIG.BIRD_SIZE / 2) * 0.6;
    } else {
      bird.radius = CONFIG.BIRD_SIZE / 2;
    }

    // Pipe Management
    if (frameCountRef.current % Math.round(difficultyRef.current.spawnRate) === 0) {
      const gap = difficultyRef.current.gapSize;
      const minPipeLen = 50;
      const maxPipeLen = CONFIG.INTERNAL_HEIGHT - gap - minPipeLen;
      const topHeight = seededRandomRange(minPipeLen, maxPipeLen);

      pipesRef.current.push({
        x: CONFIG.INTERNAL_WIDTH,
        topHeight,
        bottomY: topHeight + gap,
        width: 60,
        passed: false,
      });

      // Power-up chance
      if (seededRandomRef.current() < 0.35) {
        const types = ['SHIELD', 'SPEED', 'SHRINK'];
        const type = types[Math.floor(seededRandomRef.current() * types.length)];
        const py = topHeight + gap / 2;
        powerupsRef.current.push({
          x: CONFIG.INTERNAL_WIDTH + 30,
          y: py,
          type,
          active: true,
          baseY: py,
          offset: seededRandomRef.current() * Math.PI * 2,
        });
      }
    }

    // Update Pipes
    for (let i = pipesRef.current.length - 1; i >= 0; i--) {
      const pipe = pipesRef.current[i];
      pipe.x -= currentSpeed;

      const birdLeft = bird.x - bird.radius;
      const birdRight = bird.x + bird.radius;
      const birdTop = bird.y - bird.radius;
      const birdBottom = bird.y + bird.radius;
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + pipe.width;

      const hitTopPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdTop < pipe.topHeight;
      const hitBottomPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdBottom > pipe.bottomY;

      if (hitTopPipe || hitBottomPipe) {
        if (bird.shieldActive) {
          bird.shieldActive = false;
          pipesRef.current.splice(i, 1);
          createParticles(bird.x, bird.y, COLORS.SHIELD, 20);
          continue;
        } else {
          gameOver();
          return;
        }
      }

      if (!pipe.passed && birdLeft > pipeRight) {
        pipe.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }

      if (pipe.x + pipe.width < 0) {
        pipesRef.current.splice(i, 1);
      }
    }

    // Power-ups
    for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
      const p = powerupsRef.current[i];
      p.x -= currentSpeed;
      p.y = p.baseY + Math.sin(frameCountRef.current * 0.1 + p.offset) * 5;

      const dx = bird.x - p.x;
      const dy = bird.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (p.active && dist < bird.radius + CONFIG.POWERUP_SIZE / 2) {
        p.active = false;
        activatePowerup(p.type);
        createParticles(p.x, p.y, getPowerupColor(p.type), 10);
        powerupsRef.current.splice(i, 1);
      }

      if (p.x < -50) powerupsRef.current.splice(i, 1);
    }

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Touch Ripples
    for (let i = touchRipplesRef.current.length - 1; i >= 0; i--) {
      const r = touchRipplesRef.current[i];
      r.radius += 2;
      r.life--;
      if (r.life <= 0) touchRipplesRef.current.splice(i, 1);
    }
  }, [gameOver]);

  // --- Rendering ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = CONFIG.INTERNAL_WIDTH;
    const H = CONFIG.INTERNAL_HEIGHT;

    // Background
    ctx.fillStyle = '#1A0B2E';
    ctx.fillRect(0, 0, W, H);

    if (bgImageRef.current) {
      const scale = H / bgImageRef.current.height;
      const scaledWidth = bgImageRef.current.width * scale;
      const parallaxSpeed = 0.5;
      const scrollX = (frameCountRef.current * parallaxSpeed) % scaledWidth;
      const numTiles = Math.ceil(W / scaledWidth) + 1;
      for (let i = 0; i < numTiles; i++) {
        ctx.drawImage(bgImageRef.current, (i * scaledWidth) - scrollX, 0, scaledWidth, H);
      }
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, COLORS.BG_TOP);
      gradient.addColorStop(1, COLORS.BG_BOTTOM);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    // Pipes / Buildings
    pipesRef.current.forEach(pipe => {
      if (buildingImageRef.current) {
        const pat = ctx.createPattern(buildingImageRef.current, 'repeat');

        ctx.save();
        ctx.translate(pipe.x, 0);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, pipe.width, pipe.topHeight);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, pipe.topHeight - 10, pipe.width, 10);
        ctx.strokeStyle = '#00F3FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, pipe.width, pipe.topHeight);
        ctx.restore();

        ctx.save();
        ctx.translate(pipe.x, pipe.bottomY);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, pipe.width, H - pipe.bottomY);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, pipe.width, 10);
        ctx.strokeStyle = '#00F3FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, pipe.width, H - pipe.bottomY);
        ctx.restore();
      } else {
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.PIPE_OUTLINE;
        ctx.strokeStyle = COLORS.PIPE_OUTLINE;
        ctx.lineWidth = 3;
        ctx.fillStyle = COLORS.PIPE_BODY;
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
      ctx.shadowBlur = 15;
      ctx.shadowColor = getPowerupColor(p.type);
      ctx.fillStyle = getPowerupColor(p.type);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let char = '?';
      if (p.type === 'SHIELD') char = 'S';
      if (p.type === 'SPEED') char = '>>';
      if (p.type === 'SHRINK') char = '-';
      ctx.fillText(char, p.x, p.y);
      ctx.shadowBlur = 0;
    });

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Touch Ripples
    touchRipplesRef.current.forEach(r => {
      ctx.globalAlpha = r.life / 20;
      ctx.strokeStyle = '#BD34FE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Bird
    const bird = birdRef.current;
    ctx.shadowBlur = 20;
    ctx.shadowColor = bird.color;
    ctx.fillStyle = bird.color;

    if (bird.shieldActive) {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.SHIELD;
      ctx.lineWidth = 2;
      ctx.arc(bird.x, bird.y, bird.radius + 8 + Math.sin(frameCountRef.current * 0.2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gravity Arrow
    const arrowY = bird.y + (bird.gravityDirection * (bird.radius + 15));
    ctx.fillStyle = bird.gravityDirection === 1 ? COLORS.BIRD_NORMAL : COLORS.BIRD_INVERTED;
    ctx.beginPath();
    if (bird.gravityDirection === 1) {
      ctx.moveTo(bird.x - 5, arrowY - 5);
      ctx.lineTo(bird.x + 5, arrowY - 5);
      ctx.lineTo(bird.x, arrowY + 5);
    } else {
      ctx.moveTo(bird.x - 5, arrowY + 5);
      ctx.lineTo(bird.x + 5, arrowY + 5);
      ctx.lineTo(bird.x, arrowY - 5);
    }
    ctx.fill();
  }, []);

  // --- Game Loop ---
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const loop = () => {
      if (gameStateRef.current === 'PLAYING') {
        update();
      }
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, draw]);

  // --- Input Handlers ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current === 'START') {
          startGame();
        } else if (gameStateRef.current === 'PLAYING') {
          flipGravity();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame, flipGravity]);

  const handleCanvasInteraction = (e) => {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      flipGravity();
      // Ripple effect
      let cx, cy;
      if (e.touches) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      addTouchRipple(cx, cy);
    }
  };

  // --- Share & Challenge ---
  const getShareUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?seed=${currentSeedRef.current}&score=${scoreRef.current}`;
  };

  const copyShareLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(
        `🎮 I scored ${scoreRef.current} on Neon Gravity Flappy! Can you beat me?\n${url}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = `🎮 I scored ${scoreRef.current} on Neon Gravity Flappy! Can you beat me?\n${url}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Styles ---
  const isMobile = canvasSize.width < 500;

  return (
    <div
      className="ngf-root"
      style={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ngf-game-wrapper {
          position: relative;
          width: ${canvasSize.width}px;
          height: ${canvasSize.height}px;
          border: 2px solid rgba(189, 52, 254, 0.6);
          box-shadow: 0 0 30px rgba(189, 52, 254, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          overflow: hidden;
        }

        .ngf-game-wrapper canvas {
          display: block;
          width: 100%;
          height: 100%;
          touch-action: manipulation;
        }

        .ngf-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
        }

        .ngf-score {
          position: absolute;
          top: clamp(8px, 3vw, 24px);
          left: 0; right: 0;
          text-align: center;
          font-family: 'Orbitron', monospace;
          font-size: clamp(24px, 6vw, 48px);
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 15px #BD34FE, 0 0 30px rgba(189, 52, 254, 0.4);
          z-index: 10;
          letter-spacing: 2px;
        }

        .ngf-screen {
          pointer-events: auto;
          background: rgba(10, 5, 30, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(189, 52, 254, 0.5);
          border-radius: clamp(12px, 3vw, 24px);
          padding: clamp(20px, 5vw, 48px) clamp(16px, 4vw, 40px);
          text-align: center;
          max-width: 90%;
          width: clamp(280px, 80vw, 420px);
          box-shadow:
            0 0 40px rgba(189, 52, 254, 0.25),
            0 0 80px rgba(0, 243, 255, 0.1),
            inset 0 1px 0 rgba(255,255,255,0.08);
          animation: screenFadeIn 0.4s ease-out;
        }

        @keyframes screenFadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .ngf-screen h1 {
          font-family: 'Orbitron', monospace;
          font-size: clamp(18px, 5vw, 32px);
          font-weight: 900;
          color: #00F3FF;
          text-shadow: 0 0 15px #00F3FF;
          margin-bottom: clamp(8px, 2vw, 16px);
          text-transform: uppercase;
          letter-spacing: clamp(1px, 0.5vw, 3px);
          line-height: 1.2;
        }

        .ngf-screen p {
          font-family: 'Inter', sans-serif;
          color: #b0b0d0;
          font-size: clamp(12px, 3vw, 16px);
          margin-bottom: clamp(6px, 1.5vw, 12px);
          line-height: 1.5;
        }

        .ngf-screen .highlight {
          color: #FF0099;
          font-weight: 700;
        }

        .ngf-btn {
          display: inline-block;
          font-family: 'Orbitron', monospace;
          font-weight: 700;
          font-size: clamp(13px, 3.5vw, 18px);
          padding: clamp(10px, 2.5vw, 16px) clamp(24px, 6vw, 48px);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
          min-height: 48px;
          min-width: 48px;
        }

        .ngf-btn:active {
          transform: scale(0.95) !important;
        }

        .ngf-btn-primary {
          background: linear-gradient(135deg, #FF0099, #BD34FE);
          color: #fff;
          box-shadow: 0 0 20px rgba(255, 0, 153, 0.4), 0 4px 15px rgba(0,0,0,0.3);
        }

        .ngf-btn-primary:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255, 0, 153, 0.6), 0 6px 20px rgba(0,0,0,0.3);
        }

        .ngf-btn-secondary {
          background: rgba(0, 243, 255, 0.1);
          color: #00F3FF;
          border: 1px solid rgba(0, 243, 255, 0.4);
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.15);
        }

        .ngf-btn-secondary:hover {
          background: rgba(0, 243, 255, 0.2);
          box-shadow: 0 0 25px rgba(0, 243, 255, 0.3);
        }

        .ngf-btn-share {
          background: linear-gradient(135deg, #00C853, #00E676);
          color: #000;
          box-shadow: 0 0 20px rgba(0, 200, 83, 0.3);
        }

        .ngf-btn-share:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(0, 200, 83, 0.5);
        }

        .ngf-score-display {
          font-family: 'Orbitron', monospace;
          font-size: clamp(36px, 10vw, 64px);
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 20px #BD34FE;
          margin: clamp(4px, 1vw, 8px) 0;
        }

        .ngf-label {
          font-family: 'Inter', sans-serif;
          font-size: clamp(10px, 2.5vw, 13px);
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .ngf-challenge-banner {
          background: linear-gradient(135deg, rgba(255, 0, 153, 0.2), rgba(189, 52, 254, 0.2));
          border: 1px solid rgba(255, 0, 153, 0.4);
          border-radius: 12px;
          padding: clamp(8px, 2vw, 14px);
          margin-bottom: clamp(10px, 2vw, 16px);
        }

        .ngf-challenge-banner p {
          margin: 0;
          font-size: clamp(11px, 2.5vw, 14px);
          color: #FF0099;
          font-weight: 600;
        }

        .ngf-challenge-banner .target-score {
          font-family: 'Orbitron', monospace;
          font-size: clamp(20px, 5vw, 32px);
          font-weight: 900;
          color: #FF0099;
          text-shadow: 0 0 10px rgba(255, 0, 153, 0.5);
        }

        .ngf-result {
          font-family: 'Orbitron', monospace;
          font-size: clamp(16px, 4vw, 24px);
          font-weight: 900;
          padding: clamp(8px, 2vw, 12px);
          border-radius: 10px;
          margin: clamp(8px, 2vw, 12px) 0;
        }

        .ngf-result.win {
          color: #00FF44;
          text-shadow: 0 0 15px rgba(0, 255, 68, 0.5);
          background: rgba(0, 255, 68, 0.08);
          border: 1px solid rgba(0, 255, 68, 0.3);
        }

        .ngf-result.lose {
          color: #FF4444;
          text-shadow: 0 0 15px rgba(255, 68, 68, 0.5);
          background: rgba(255, 68, 68, 0.08);
          border: 1px solid rgba(255, 68, 68, 0.3);
        }

        .ngf-result.tie {
          color: #FFAA00;
          text-shadow: 0 0 15px rgba(255, 170, 0, 0.5);
          background: rgba(255, 170, 0, 0.08);
          border: 1px solid rgba(255, 170, 0, 0.3);
        }

        .ngf-btn-row {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 2vw, 12px);
          margin-top: clamp(10px, 2vw, 16px);
          align-items: center;
        }

        .ngf-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(189,52,254,0.3), transparent);
          margin: clamp(8px, 2vw, 14px) 0;
        }

        .ngf-hint {
          animation: pulse 2.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .ngf-copied {
          animation: copiedFlash 0.3s ease-out;
        }

        @keyframes copiedFlash {
          from { transform: scale(1.1); }
          to { transform: scale(1); }
        }

        @media (max-width: 480px) {
          .ngf-game-wrapper {
            border: none;
            border-radius: 0;
          }
        }
      `}</style>

      <div className="ngf-game-wrapper">
        <canvas
          ref={canvasRef}
          width={CONFIG.INTERNAL_WIDTH}
          height={CONFIG.INTERNAL_HEIGHT}
          onClick={handleCanvasInteraction}
          onTouchStart={handleCanvasInteraction}
        />

        {/* Score HUD */}
        {gameState === 'PLAYING' && (
          <div className="ngf-score">{score}</div>
        )}

        {/* START Screen */}
        {gameState === 'START' && (
          <div className="ngf-overlay">
            <div className="ngf-screen">
              <h1>Neon Gravity Flappy</h1>

              {isChallenge && challengeScore.current !== null && (
                <div className="ngf-challenge-banner">
                  <p>🎯 Challenge Mode</p>
                  <p>Beat this score:</p>
                  <div className="target-score">{challengeScore.current}</div>
                </div>
              )}

              <p>
                Press <span className="highlight">SPACE</span> or{' '}
                <span className="highlight">TAP</span> to flip gravity
              </p>
              <p className="ngf-hint" style={{ fontSize: 'clamp(11px, 2.5vw, 14px)' }}>
                Avoid the buildings!
              </p>

              <div className="ngf-btn-row">
                <button className="ngf-btn ngf-btn-primary" onClick={startGame}>
                  {isChallenge ? '⚔️ Accept Challenge' : '▶ Start Game'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER Screen */}
        {gameState === 'GAMEOVER' && (
          <div className="ngf-overlay">
            <div className="ngf-screen">
              <h1 style={{ color: '#FF0099', textShadow: '0 0 15px #FF0099' }}>Game Over</h1>

              <div className="ngf-label">Score</div>
              <div className="ngf-score-display">{score}</div>

              <div className="ngf-divider" />

              <div className="ngf-label">Best</div>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 'clamp(18px, 5vw, 28px)',
                fontWeight: 700,
                color: '#BD34FE',
                textShadow: '0 0 10px rgba(189,52,254,0.5)',
                marginBottom: 'clamp(4px, 1vw, 8px)',
              }}>
                {highScore}
              </div>

              {/* Challenge Result */}
              {isChallenge && challengeScore.current !== null && (
                <>
                  <div className="ngf-divider" />
                  <div className="ngf-label">vs Challenger</div>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: 'clamp(16px, 4vw, 22px)',
                    color: '#FF0099',
                    margin: '4px 0',
                  }}>
                    {challengeScore.current}
                  </div>
                  <div className={`ngf-result ${score > challengeScore.current ? 'win' :
                      score < challengeScore.current ? 'lose' : 'tie'
                    }`}>
                    {score > challengeScore.current
                      ? '🏆 YOU WIN!'
                      : score < challengeScore.current
                        ? '💀 DEFEATED'
                        : '🤝 TIE!'}
                  </div>
                </>
              )}

              <div className="ngf-btn-row">
                <button className="ngf-btn ngf-btn-primary" onClick={startGame}>
                  ↻ Try Again
                </button>
                <button className="ngf-btn ngf-btn-share" onClick={() => setShowShareModal(true)}>
                  📤 Challenge a Friend
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div
            className="ngf-overlay"
            style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}
          >
            <div className="ngf-screen" onClick={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
              <h1 style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}>⚔️ Challenge a Friend</h1>

              <p style={{ color: '#b0b0d0' }}>
                Share this link — your friend will play the <span className="highlight">exact same level</span> and try to beat your score!
              </p>

              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(189,52,254,0.3)',
                borderRadius: '10px',
                padding: 'clamp(8px, 2vw, 14px)',
                margin: 'clamp(8px, 2vw, 12px) 0',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: 'clamp(9px, 2vw, 12px)',
                color: '#00F3FF',
                lineHeight: 1.4,
              }}>
                {getShareUrl()}
              </div>

              <div className="ngf-btn-row">
                <button
                  className={`ngf-btn ngf-btn-primary ${copied ? 'ngf-copied' : ''}`}
                  onClick={copyShareLink}
                >
                  {copied ? '✅ Copied!' : '📋 Copy Challenge Link'}
                </button>
                <button
                  className="ngf-btn ngf-btn-secondary"
                  onClick={() => setShowShareModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeonGravityFlappy;
