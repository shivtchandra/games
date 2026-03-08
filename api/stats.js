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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const redis = await getRedis();

        const [totalPageVisits, firstVisit, lastVisit] = await Promise.all([
            redis.get('analytics:totalPageVisits'),
            redis.get('analytics:firstVisit'),
            redis.get('analytics:lastVisit'),
        ]);

        const gameNames = await redis.sMembers('analytics:gameNames');

        const games = {};
        for (const name of gameNames) {
            const [opens, plays, totalScore, highScore, lastPlayed] = await Promise.all([
                redis.get(`analytics:game:${name}:opens`),
                redis.get(`analytics:game:${name}:plays`),
                redis.get(`analytics:game:${name}:totalScore`),
                redis.get(`analytics:game:${name}:highScore`),
                redis.get(`analytics:game:${name}:lastPlayed`),
            ]);
            games[name] = {
                opens: Number(opens) || 0,
                plays: Number(plays) || 0,
                totalScore: Number(totalScore) || 0,
                highScore: Number(highScore) || 0,
                lastPlayed: lastPlayed || null,
            };
        }

        const rawLog = await redis.lRange('analytics:sessionLog', 0, 49);
        const sessionLog = rawLog.map(entry => {
            try { return JSON.parse(entry); } catch { return entry; }
        });

        return res.status(200).json({
            totalPageVisits: Number(totalPageVisits) || 0,
            firstVisit: firstVisit || null,
            lastVisit: lastVisit || null,
            games,
            sessionLog,
        });
    } catch (err) {
        console.error('Stats error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
