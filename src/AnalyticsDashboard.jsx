import React, { useState, useEffect, useCallback } from 'react';
import { getAnalytics, getSessionHistory } from './analytics';

// Password: "theone"
const ADMIN_HASH = 'c868019747cc080315c26b5e1cf892dbb3a32f65d6b412952516484e5684784a';

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
        const id = setInterval(refresh, 8000);
        return () => clearInterval(id);
    }, [authed, refresh]);

    const handleLogin = (e) => {
        e.preventDefault();
        // Password is "theone"
        if (password === 'theone') {
            setAuthed(true);
            setError('');
        } else {
            setError('ACCESS DENIED');
            setPassword('');
        }
    };

    const handleBack = () => {
        window.location.hash = '';
    };

    if (!authed) {
        return (
            <div style={s.loginWrapper}>
                <div style={s.loginCard}>
                    <h1 style={s.loginTitle}>ADMIN</h1>
                    <form onSubmit={handleLogin} style={s.loginForm}>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="PASSWORD"
                            style={s.loginInput}
                            autoFocus
                        />
                        <button type="submit" style={s.loginBtn}>ENTER</button>
                    </form>
                    {error && <p style={s.loginError}>{error}</p>}
                    <button onClick={handleBack} style={s.backLink}>EXIT</button>
                </div>
            </div>
        );
    }

    const totalPlays = data ? Object.values(data.games).reduce((a, g) => a + g.plays, 0) : 0;
    const totalOpens = data ? Object.values(data.games).reduce((a, g) => a + g.opens, 0) : 0;
    const gameEntries = data ? Object.entries(data.games) : [];
    const globalHighScore = gameEntries.length > 0 ? Math.max(...gameEntries.map(([, g]) => g.highScore)) : 0;

    const formatTime = (iso) => {
        if (!iso) return 'NEVER';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div style={s.wrapper}>
            <header style={s.topBar}>
                <div style={s.topTitle}>
                    <h1 style={s.topH1}>SYSTEM_STATS</h1>
                    <span style={{ ...s.status, color: loading ? '#555' : '#fff' }}>{loading ? 'SYNCING...' : 'LIVE'}</span>
                </div>
                <button onClick={handleBack} style={s.topExit}>CLOSE</button>
            </header>

            <main style={s.main}>
                <div style={s.grid}>
                    <StatBox label="TOTAL_VISITS" value={data?.totalPageVisits ?? 0} />
                    <StatBox label="GAME_OPENS" value={totalOpens} />
                    <StatBox label="TOTAL_PLAYS" value={totalPlays} />
                    <StatBox label="MAX_SCORE" value={globalHighScore} />
                </div>

                <div style={s.columns}>
                    <div style={s.col}>
                        <h2 style={s.h2}>GAME_METRICS</h2>
                        {gameEntries.map(([name, g]) => (
                            <div key={name} style={s.dataRow}>
                                <div style={s.rowHeader}>
                                    <span style={s.name}>{name.toUpperCase()}</span>
                                    <span style={s.small}>LST: {formatTime(g.lastPlayed)}</span>
                                </div>
                                <div style={s.rowStats}>
                                    <span>OPN: {g.opens}</span>
                                    <span>PLY: {g.plays}</span>
                                    <span style={s.bold}>HI: {g.highScore}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={s.col}>
                        <h2 style={s.h2}>ACTIVITY_LOG</h2>
                        <div style={s.log}>
                            {sessions.slice(0, 15).map((e, i) => (
                                <div key={i} style={s.logItem}>
                                    <span style={s.logTime}>[{formatTime(e.timestamp)}]</span>
                                    <span style={s.logText}>{e.type.toUpperCase()} {e.game ? `// ${e.game.toUpperCase()}` : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const StatBox = ({ label, value }) => (
    <div style={s.statBox}>
        <span style={s.statLabel}>{label}</span>
        <span style={s.statValue}>{value}</span>
    </div>
);

const s = {
    loginWrapper: {
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#000', color: '#fff', fontFamily: 'monospace',
    },
    loginCard: {
        width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    },
    loginTitle: { margin: 0, letterSpacing: '4px', fontSize: '18px' },
    loginForm: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
    loginInput: {
        width: '100%', padding: '12px', border: '1px solid #333', backgroundColor: '#000',
        color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', textAlign: 'center',
        fontFamily: 'monospace',
    },
    loginBtn: {
        padding: '12px', border: '1px solid #fff', backgroundColor: '#fff', color: '#000',
        cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace',
    },
    loginError: { color: '#555', fontSize: '12px' },
    backLink: {
        background: 'none', border: 'none', color: '#333', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'monospace',
    },

    wrapper: {
        position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff',
        fontFamily: 'monospace', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    topBar: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid #222',
    },
    topTitle: { display: 'flex', alignItems: 'center', gap: 20 },
    topH1: { fontSize: '16px', margin: 0, letterSpacing: '2px' },
    status: { fontSize: '10px' },
    topExit: {
        background: 'none', border: '1px solid #333', color: '#fff', padding: '6px 12px',
        cursor: 'pointer', fontSize: '10px',
    },

    main: { flex: 1, padding: '40px', overflowY: 'auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 },
    statBox: { border: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 },
    statLabel: { fontSize: '10px', color: '#555' },
    statValue: { fontSize: '24px' },

    columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 },
    col: { minWidth: 0 },
    h2: { fontSize: '12px', color: '#555', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '20px', letterSpacing: '1px' },
    dataRow: { border: '1px solid #222', padding: '15px', marginBottom: '10px' },
    rowHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    name: { fontSize: '14px', fontWeight: 'bold' },
    small: { fontSize: '10px', color: '#555' },
    rowStats: { display: 'flex', gap: '20px', fontSize: '12px' },
    bold: { borderLeft: '1px solid #333', paddingLeft: '20px' },

    log: { display: 'flex', flexDirection: 'column', gap: '8px' },
    logItem: { fontSize: '11px', display: 'flex', gap: '10px' },
    logTime: { color: '#333' },
    logText: { color: '#888' },
};

export default AdminPanel;
