import db from '../config/db.js';

export function getListingsHistory(req, res) {
    try {
        const user = req.user;
        const listings = db.prepare('SELECT * FROM listings WHERE user_id = ? ORDER BY posted_at DESC').all(user.id);
        res.json(listings);
    } catch (error) {
        console.error('DB fetch listings error:', error.message);
        res.status(500).json({ error: 'Error al obtener historial de listados' });
    }
}

export function getLogs(req, res) {
    try {
        const user = req.user;
        const limit = parseInt(req.query.limit) || 50;
        const logs = db.prepare('SELECT * FROM agent_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?').all(user.id, limit);
        res.json(logs);
    } catch (error) {
        console.error('DB fetch logs error:', error.message);
        res.status(500).json({ error: 'Error al obtener registros del agente' });
    }
}
