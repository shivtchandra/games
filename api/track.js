import { createClient } from 'redis';

let client;
async function getRedis() {
    if (!client) {
        client = createClient({ url: process.env.REDIS_URL });
        client.on('error', (err) => console.error('Redis error:', err));
        await client.connect();
    }
    return client;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const redis = await getRedis();
        const { type, game, score } = req.body;
        const timestamp = new Date().toISOString();

        if (type === 'visit') {
            await redis.incr('analytics:totalPageVisits');
            const first = await redis.get('analytics:firstVisit');
            if (!first) await redis.set('analytics:firstVisit', timestamp);
            await redis.set('analytics:lastVisit', timestamp);
        }

        if (type === 'open' && game) {
            await redis.incr(`analytics:game:${game}:opens`);
        }

        if (type === 'start' && game) {
            await redis.incr(`analytics:game:${game}:plays`);
            await redis.set(`analytics:game:${game}:lastPlayed`, timestamp);
        }

        if (type === 'end' && game && typeof score === 'number') {
            await redis.incrByFloat(`analytics:game:${game}:totalScore`, score);
            const currentHigh = await redis.get(`analytics:game:${game}:highScore`);
            if (score > Number(currentHigh || 0)) {
                await redis.set(`analytics:game:${game}:highScore`, String(score));
            }
        }

        // Session log (capped list)
        const entry = JSON.stringify({ type, game: game || null, score: score ?? null, timestamp });
        await redis.lPush('analytics:sessionLog', entry);
        await redis.lTrim('analytics:sessionLog', 0, 49);

        // Track game names
        if (game) await redis.sAdd('analytics:gameNames', game);

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Track error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
