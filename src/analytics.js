/**
 * Game Analytics Engine — API-backed
 * Sends analytics events to /api/track (Vercel serverless → Upstash Redis)
 * Reads stats from /api/stats
 */

function sendEvent(payload) {
    // Fire-and-forget — don't block gameplay
    fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).catch(() => { /* silently fail if offline */ });
}

export function trackPageVisit() {
    sendEvent({ type: 'visit' });
}

export function trackGameOpen(gameName) {
    sendEvent({ type: 'open', game: gameName });
}

export function trackGameStart(gameName) {
    sendEvent({ type: 'start', game: gameName });
}

export function trackGameEnd(gameName, score) {
    sendEvent({ type: 'end', game: gameName, score });
}

export async function getAnalytics() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Bad response');
        return await res.json();
    } catch {
        // Return empty data if API unavailable
        return {
            totalPageVisits: 0,
            games: {},
            sessionLog: [],
            firstVisit: null,
            lastVisit: null,
        };
    }
}

export async function getSessionHistory() {
    const data = await getAnalytics();
    return data.sessionLog || [];
}
