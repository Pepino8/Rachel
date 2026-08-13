import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { encrypt, GAMEFLIP_API_BASE, getAuthHeaders } from '../services/gameflip.js';
import { authenticator } from 'otplib';

export function login(req, res) {
    try {
        const { username, password } = req.body;

        // 1. Check admin env credentials
        const expectedUsername = process.env.ADMIN_USERNAME;
        const expectedPassword = process.env.ADMIN_PASSWORD;

        if (username === expectedUsername && password === expectedPassword) {
            const token = jwt.sign(
                { id: 'admin', username: expectedUsername, role: 'admin' },
                process.env.JWT_SECRET || 'rachel-default-fallback-encryption-secret-key-32',
                { expiresIn: '7d' }
            );
            return res.json({
                success: true,
                token: token,
                user: {
                    id: 'admin',
                    username: expectedUsername,
                    email: 'admin@rachel.com',
                    role: 'admin'
                }
            });
        }

        // 2. Check users database
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (user) {
            let passwordMatches = false;
            const isPlaintext = !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$');

            if (isPlaintext) {
                passwordMatches = (user.password === password);
                if (passwordMatches) {
                    const hashedPassword = bcrypt.hashSync(password, 10);
                    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
                }
            } else {
                passwordMatches = bcrypt.compareSync(password, user.password);
            }

            if (passwordMatches) {
                const token = jwt.sign(
                    { id: user.id, username: user.username, role: 'user' },
                    process.env.JWT_SECRET || 'rachel-default-fallback-encryption-secret-key-32',
                    { expiresIn: '7d' }
                );
                return res.json({
                    success: true,
                    token: token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: 'user'
                    }
                });
            }
        }

        res.status(401).json({ error: 'Incorrect username or password' });
    } catch (error) {
        console.error('API login error:', error.message);
        res.status(500).json({ error: 'Error interno al iniciar sesión' });
    }
}

export function register(req, res) {
    try {
        const { username, password } = req.body;

        const expectedUsername = process.env.ADMIN_USERNAME;
        if (username.toLowerCase() === expectedUsername.toLowerCase()) {
            return res.status(400).json({ error: 'Username is not available.' });
        }

        const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username is already registered.' });
        }

        const userId = crypto.randomUUID();
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare(`
            INSERT INTO users (id, username, password)
            VALUES (?, ?, ?)
        `).run(userId, username, hashedPassword);

        const token = jwt.sign(
            { id: userId, username, role: 'user' },
            process.env.JWT_SECRET || 'rachel-default-fallback-encryption-secret-key-32',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: token,
            user: {
                id: userId,
                username,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('API register error:', error.message);
        res.status(500).json({ error: 'Error interno al registrar usuario' });
    }
}

export function getMe(req, res) {
    try {
        const user = req.user;
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.id === 'admin' ? 'admin' : 'user',
                hasGameflipLinked: !!(user.gameflip_api_key_enc && user.gameflip_totp_secret_enc)
            }
        });
    } catch (error) {
        console.error('API me error:', error.message);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
}

export function updateProfile(req, res) {
    try {
        const user = req.user;
        const { username, password, confirmPassword } = req.body;

        if (user.id === 'admin') {
            return res.status(400).json({ error: 'Modifying the global administrator account from the API is not allowed.' });
        }

        if (username && username !== user.username) {
            const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
            if (username.toLowerCase() === expectedUsername.toLowerCase()) {
                return res.status(400).json({ error: 'Username is not available.' });
            }

            const existingUser = db.prepare('SELECT * FROM users WHERE username = ? AND id != ?').get(username, user.id);
            if (existingUser) {
                return res.status(400).json({ error: 'Username is already in use.' });
            }

            db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
            user.username = username;
        }

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('API update profile error:', error.message);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
}

export async function updateGameflip(req, res) {
    try {
        const user = req.user;
        const { apiKey, totpSecret } = req.body;

        try {
            const totp = authenticator.generate(totpSecret);
            await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
                headers: {
                    'Authorization': `GFAPI ${apiKey}:${totp}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.error('Invalid Gameflip credentials linked:', err.response?.data || err.message);
            return res.status(400).json({ error: 'Gameflip credentials are not valid. Please verify them.' });
        }

        const encryptedApiKey = encrypt(apiKey);
        const encryptedTotpSecret = encrypt(totpSecret);

        db.prepare(`
            INSERT INTO users (id, username, gameflip_api_key_enc, gameflip_totp_secret_enc)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                gameflip_api_key_enc = excluded.gameflip_api_key_enc,
                gameflip_totp_secret_enc = excluded.gameflip_totp_secret_enc
        `).run(user.id, user.username, encryptedApiKey, encryptedTotpSecret);

        res.json({
            success: true,
            message: 'Gameflip account linked successfully.'
        });
    } catch (error) {
        console.error('API update gameflip error:', error.message);
        res.status(500).json({ error: 'Error al vincular cuenta de Gameflip' });
    }
}

export function getUsers(req, res) {
    try {
        const user = req.user;
        if (user.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').all();
        res.json({ success: true, users });
    } catch (error) {
        console.error('API get users error:', error.message);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
}

export function deleteUser(req, res) {
    try {
        const currentUser = req.user;
        if (currentUser.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        const { id } = req.params;

        const deleteTx = db.transaction((userId) => {
            db.prepare('DELETE FROM listings WHERE product_id IN (SELECT id FROM products WHERE user_id =?)').run(userId);
            db.prepare('DELETE FROM listings WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM products WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM agent_logs WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        });
        deleteTx(id);

        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('API delete user error:', error.message);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
}

export async function getProfile(req, res) {
    try {
        const user = req.user;
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
            headers: getAuthHeaders(user)
        });
        res.json(response.data.data);
    } catch (error) {
        console.error('API profile error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}
