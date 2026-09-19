import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { encrypt, GAMEFLIP_API_BASE, getAuthHeaders } from '../services/gameflip.js';
import { authenticator } from 'otplib';

export async function login(req, res) {
    try {
        const { username, password } = req.body;

        // 1. Check admin env credentials
        const expectedUsername = process.env.ADMIN_USERNAME;
        const expectedPassword = process.env.ADMIN_PASSWORD;

        if (expectedUsername && expectedPassword && username === expectedUsername && password === expectedPassword) {
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
        const { data: user, error: fetchErr } = await db
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (fetchErr) {
            console.error('API login DB error:', fetchErr.message);
            return res.status(500).json({ error: 'Error interno al iniciar sesión' });
        }

        if (user) {
            let passwordMatches = false;
            const isPlaintext = !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$');

            if (isPlaintext) {
                passwordMatches = (user.password === password);
                if (passwordMatches) {
                    const hashedPassword = bcrypt.hashSync(password, 10);
                    await db.from('users').update({ password: hashedPassword }).eq('id', user.id);
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

export async function register(req, res) {
    try {
        const { username, password } = req.body;

        const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
        if (username.toLowerCase() === adminUsername || username.toLowerCase() === 'admin') {
            return res.status(400).json({ error: 'Username is not available.' });
        }

        const { data: existingUser } = await db
            .from('users')
            .select('id')
            .ilike('username', username)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ error: 'Username is already registered.' });
        }

        const userId = crypto.randomUUID();
        const hashedPassword = bcrypt.hashSync(password, 10);
        const { error: insertErr } = await db.from('users').insert({
            id: userId,
            username: username,
            password: hashedPassword
        });

        if (insertErr) {
            console.error('API register insert error:', insertErr.message);
            return res.status(500).json({ error: 'Error interno al registrar usuario' });
        }

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

export async function updateProfile(req, res) {
    try {
        const user = req.user;
        const { username, password } = req.body;

        if (user.id === 'admin') {
            return res.status(400).json({ error: 'Modifying the global administrator account from the API is not allowed.' });
        }

        const updates = {};

        if (username && username !== user.username) {
            const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
            if (username.toLowerCase() === adminUsername || username.toLowerCase() === 'admin') {
                return res.status(400).json({ error: 'Username is not available.' });
            }

            const { data: existingUser } = await db
                .from('users')
                .select('id')
                .ilike('username', username)
                .neq('id', user.id)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({ error: 'Username is already in use.' });
            }

            updates.username = username;
            user.username = username;
        }

        if (password) {
            updates.password = bcrypt.hashSync(password, 10);
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await db.from('users').update(updates).eq('id', user.id);
            if (updateErr) {
                console.error('API update profile DB error:', updateErr.message);
                return res.status(500).json({ error: 'Error al actualizar perfil' });
            }
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

        const { error: updateErr } = await db
            .from('users')
            .upsert({
                id: user.id,
                username: user.username,
                gameflip_api_key_enc: encryptedApiKey,
                gameflip_totp_secret_enc: encryptedTotpSecret
            });

        if (updateErr) {
            console.error('API update gameflip DB error:', updateErr.message);
            return res.status(500).json({ error: 'Error al vincular cuenta de Gameflip' });
        }

        res.json({
            success: true,
            message: 'Gameflip account linked successfully.'
        });
    } catch (error) {
        console.error('API update gameflip error:', error.message);
        res.status(500).json({ error: 'Error al vincular cuenta de Gameflip' });
    }
}

export async function getUsers(req, res) {
    try {
        const user = req.user;
        if (user.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        const { data: users, error: fetchErr } = await db
            .from('users')
            .select('id, username, email, created_at')
            .order('created_at', { ascending: false });

        if (fetchErr) {
            console.error('API get users DB error:', fetchErr.message);
            return res.status(500).json({ error: 'Error al obtener usuarios' });
        }
        res.json({ success: true, users: users || [] });
    } catch (error) {
        console.error('API get users error:', error.message);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
}

export async function deleteUser(req, res) {
    try {
        const currentUser = req.user;
        if (currentUser.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        const { id } = req.params;

        await db.from('listings').delete().eq('user_id', id);
        await db.from('products').delete().eq('user_id', id);
        await db.from('agent_logs').delete().eq('user_id', id);
        const { error: deleteErr } = await db.from('users').delete().eq('id', id);

        if (deleteErr) {
            console.error('API delete user DB error:', deleteErr.message);
            return res.status(500).json({ error: 'Error al eliminar usuario' });
        }

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
