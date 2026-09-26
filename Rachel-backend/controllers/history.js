import db from '../config/db.js';

export async function getListingsHistory(req, res) {
    try {
        const user = req.user;
        const { data: listings, error } = await db
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .order('posted_at', { ascending: false });

        if (error) {
            console.error('DB fetch listings error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch listings history' });
        }
        res.json(listings || []);
    } catch (error) {
        console.error('DB fetch listings error:', error.message);
        res.status(500).json({ error: 'Failed to fetch listings history' });
    }
}

export async function getLogs(req, res) {
    try {
        const user = req.user;
        const limit = parseInt(req.query.limit) || 50;
        const { data: logs, error } = await db
            .from('agent_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('DB fetch logs error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch agent logs' });
        }
        res.json(logs || []);
    } catch (error) {
        console.error('DB fetch logs error:', error.message);
        res.status(500).json({ error: 'Failed to fetch agent logs' });
    }
}
