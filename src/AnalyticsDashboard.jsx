import React, { useState, useEffect, useCallback } from 'react';
import { getAnalytics, getSessionHistory } from './analytics';

// Simple hash for password check (no backend needed)
const ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // "admin"
async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const AdminPanel = () => {
    const [authed, setAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [sessions, setSessions] = useState([]);

    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [analytics, history] = await Promise.all([
                getAnalytics(),
                getSessionHistory(),
            ]);
            setData(analytics);
            setSessions(history);
        } catch { /* silently fail */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (authed) refresh();
    }, [authed, refresh]);

    useEffect(() => {
        if (!authed) return;
        const id = setInterval(refresh, 5000);
        return () => clearInterval(id);
    }, [authed, refresh]);

    const handleLogin = async (e) => {
        e.preventDefault();
        const hash = await sha256(password);
        if (hash === ADMIN_HASH) {
            setAuthed(true);
            setError('');
        } else {
            setError('Incorrect password');
            setPassword('');
        }
    };

    const handleBack = () => {
        window.location.hash = '';
    };

    // --- LOGIN SCREEN ---
    if (!authed) {
        return (
            <div style={s.loginWrapper}>
                <div style={s.loginCard}>
                    <div style={s.lockIcon}>🔒</div>
                    <h1 style={s.loginTitle}>Admin Panel</h1>
                    <p style={s.loginSub}>Enter password to view analytics</p>
                    <form onSubmit={handleLogin} style={s.loginForm}>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                            style={s.loginInput}
                            autoFocus
                        />
                        <button type="submit" style={s.loginBtn}>
                            Authenticate →
                        </button>
                    </form>
                    {error && <p style={s.loginError}>{error}</p>}
                    <button onClick={handleBack} style={s.backLink}>← Back to game</button>
                </div>
            </div>
        );
    }

    // --- DASHBOARD ---
    const totalPlays = data ? Object.values(data.games).reduce((a, g) => a + g.plays, 0) : 0;
    const totalOpens = data ? Object.values(data.games).reduce((a, g) => a + g.opens, 0) : 0;
    const gameEntries = data ? Object.entries(data.games) : [];
    const globalHighScore = gameEntries.length > 0 ? Math.max(...gameEntries.map(([, g]) => g.highScore)) : 0;
    const globalAvg = totalPlays > 0
        ? (gameEntries.reduce((a, [, g]) => a + g.totalScore, 0) / totalPlays).toFixed(1)
        : '—';

    const formatTime = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h ago`;
        return `${Math.floor(diffH / 24)}d ago`;
    };

    const getIcon = (type) => ({ visit: '👁️', open: '📂', start: '🎮', end: '🏁' }[type] || '•');
    const getLabel = (e) => {
        switch (e.type) {
            case 'visit': return 'Page visited';
            case 'open': return `Opened ${e.game}`;
            case 'start': return `Started playing ${e.game}`;
            case 'end': return `Game over — Score: ${e.score}`;
            default: return e.type;
        }
    };

    return (
        <div style={s.wrapper}>
            {/* Top bar */}
            <header style={s.topBar}>
                <button onClick={handleBack} style={s.topBackBtn}>← Back</button>
                <div style={s.topTitle}>
                    <span style={{ fontSize: 22 }}>📊</span>
                    <h1 style={s.topH1}>Game Hub Admin</h1>
                </div>
                <span style={{ ...s.topLive, color: loading ? '#F59E0B' : '#10B981' }}>
                    {loading ? '⟳ LOADING' : '● LIVE'}
                </span>
            </header>

            <main style={s.main}>
                {/* Overview row */}
                <div style={s.cardGrid}>
                    <StatCard icon="👁️" label="Page Visits" value={data?.totalPageVisits ?? 0} color="#8B5CF6" />
                    <StatCard icon="📂" label="Game Opens" value={totalOpens} color="#06B6D4" />
                    <StatCard icon="🎮" label="Games Played" value={totalPlays} color="#10B981" />
                    <StatCard icon="🏆" label="Best Score" value={globalHighScore} color="#F59E0B" />
                    <StatCard icon="📈" label="Avg Score" value={globalAvg} color="#EC4899" />
                    <StatCard icon="📅" label="Since" value={data?.firstVisit ? new Date(data.firstVisit).toLocaleDateString() : '—'} color="#6366F1" small />
                </div>

                <div style={s.columns}>
                    {/* Left: per-game */}
                    <div style={s.colLeft}>
                        <h2 style={s.sectionTitle}>Per-Game Breakdown</h2>
                        {gameEntries.length === 0 && <p style={s.empty}>No game data yet. Play a game first!</p>}
                        {gameEntries.map(([name, g]) => {
                            const avg = g.plays > 0 ? (g.totalScore / g.plays).toFixed(1) : '—';
                            const convRate = g.opens > 0 ? ((g.plays / g.opens) * 100).toFixed(0) : '—';
                            return (
                                <div key={name} style={s.gameCard}>
                                    <div style={s.gameHeader}>
                                        <span style={s.gameName}>{name}</span>
                                        <span style={s.gameLastPlayed}>Last: {formatTime(g.lastPlayed)}</span>
                                    </div>
                                    <div style={s.gameStats}>
                                        <Mini label="Opens" value={g.opens} />
                                        <Mini label="Plays" value={g.plays} />
                                        <Mini label="Conv %" value={convRate !== '—' ? `${convRate}%` : '—'} />
                                        <Mini label="Avg Score" value={avg} />
                                        <Mini label="High Score" value={g.highScore} glow />
                                    </div>
                                    <div style={s.barBg}>
                                        <div style={{
                                            ...s.barFill,
                                            width: `${g.opens > 0 ? Math.min((g.plays / g.opens) * 100, 100) : 0}%`
                                        }} />
                                    </div>
                                    <span style={s.barLabel}>Play-through rate</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: activity log */}
                    <div style={s.colRight}>
                        <h2 style={s.sectionTitle}>Recent Activity</h2>
                        <div style={s.timeline}>
                            {sessions.length === 0 && <p style={s.empty}>No activity yet.</p>}
                            {sessions.slice(0, 30).map((entry, i) => (
                                <div key={i} style={s.tlItem}>
                                    <span style={s.tlIcon}>{getIcon(entry.type)}</span>
                                    <div style={s.tlBody}>
                                        <span style={s.tlLabel}>{getLabel(entry)}</span>
                                        <span style={s.tlTime}>{formatTime(entry.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- Sub-components ---
const StatCard = ({ icon, label, value, color, small }) => (
    <div style={{ ...s.stat, borderColor: color + '33' }}>
        <div style={{ ...s.statGlow, background: `radial-gradient(circle at 50% 0%, ${color}18 0%, transparent 70%)` }} />
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: small ? 16 : 28, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
        <span style={s.statLabel}>{label}</span>
    </div>
);

const Mini = ({ label, value, glow }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: glow ? '#F59E0B' : '#D1D0F0', lineHeight: 1.2 }}>{value}</span>
        <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
);

// --- Styles ---
const s = {
    // Login
    loginWrapper: {
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A1A 0%, #0F0B24 50%, #0A0A1A 100%)',
        fontFamily: "'Inter','Segoe UI',sans-serif",
    },
    loginCard: {
        width: 360, padding: '48px 36px', borderRadius: 20,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 8px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    },
    lockIcon: { fontSize: 48, marginBottom: 8 },
    loginTitle: { margin: 0, fontSize: 24, fontWeight: 800, color: '#E2E0FF', letterSpacing: '-0.02em' },
    loginSub: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
    loginForm: { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
    loginInput: {
        width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(139,92,246,0.25)',
        background: 'rgba(0,0,0,0.3)', color: '#E2E0FF', fontSize: 15, outline: 'none',
        boxSizing: 'border-box', transition: 'border-color 0.2s',
    },
    loginBtn: {
        padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#fff',
        fontSize: 15, fontWeight: 700, transition: 'opacity 0.2s',
    },
    loginError: { color: '#EF4444', fontSize: 13, margin: '8px 0 0' },
    backLink: {
        marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
        cursor: 'pointer', fontSize: 13, textDecoration: 'underline',
    },

    // Dashboard wrapper
    wrapper: {
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #08061A 0%, #0C0A1E 100%)',
        fontFamily: "'Inter','Segoe UI',sans-serif", color: '#E2E0FF', overflow: 'hidden',
    },
    topBar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(139,92,246,0.04)', flexShrink: 0,
    },
    topBackBtn: {
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '8px 16px', color: '#CFCBFF', cursor: 'pointer',
        fontSize: 13, fontWeight: 600,
    },
    topTitle: { display: 'flex', alignItems: 'center', gap: 10 },
    topH1: { margin: 0, fontSize: 18, fontWeight: 700 },
    topLive: { fontSize: 12, fontWeight: 700, color: '#10B981', letterSpacing: '0.05em' },

    // Main
    main: { flex: 1, overflowY: 'auto', padding: '20px 24px 60px' },
    cardGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12, marginBottom: 24,
    },
    stat: {
        position: 'relative', overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)', border: '1px solid',
        borderRadius: 16, padding: '20px 10px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    },
    statGlow: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '60%', pointerEvents: 'none',
    },
    statLabel: {
        fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
    },

    // Columns
    columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
    colLeft: { minWidth: 0 }, colRight: { minWidth: 0 },
    sectionTitle: {
        margin: '0 0 14px', fontSize: 13, fontWeight: 700,
        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em',
    },
    empty: { fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },

    // Game card
    gameCard: {
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14, padding: '16px 16px 12px', marginBottom: 12,
    },
    gameHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    gameName: { fontSize: 15, fontWeight: 700, color: '#E2E0FF' },
    gameLastPlayed: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
    gameStats: {
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 12,
    },
    barBg: {
        height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
    },
    barFill: {
        height: '100%', borderRadius: 3,
        background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)', transition: 'width 0.5s',
    },
    barLabel: {
        display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.25)',
        marginTop: 4, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em',
    },

    // Timeline
    timeline: { display: 'flex', flexDirection: 'column', gap: 2 },
    tlItem: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
        borderRadius: 8, background: 'rgba(255,255,255,0.015)',
    },
    tlIcon: { fontSize: 16, flexShrink: 0 },
    tlBody: {
        flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    },
    tlLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 },
    tlTime: { fontSize: 10, color: 'rgba(255,255,255,0.28)', flexShrink: 0 },
};

// Responsive: on small screens stack columns
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @media (max-width: 700px) {
        .admin-columns { grid-template-columns: 1fr !important; }
    }
`;
document.head.appendChild(styleSheet);

export default AdminPanel;
