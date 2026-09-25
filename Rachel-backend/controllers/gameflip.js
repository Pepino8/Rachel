import axios from 'axios';
import { GAMEFLIP_API_BASE, getAuthHeaders } from '../services/gameflip.js';

export async function getGameflipStatus(req, res) {
    const user = req.user;
    try {
        const headers = getAuthHeaders(user);
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, { headers });
        const profile = response.data?.data || {};

        const now = new Date();
        const onlineUntilDate = profile.online_until ? new Date(profile.online_until) : null;
        const isOnline = onlineUntilDate ? onlineUntilDate > now : false;
        const remainingMs = isOnline ? onlineUntilDate.getTime() - now.getTime() : 0;

        return res.json({
            success: true,
            isOnline,
            onlineUntil: profile.online_until || null,
            remainingMs,
            displayName: profile.display_name || user.username,
            avatar: profile.avatar || null,
            chatEnabled: !!profile.chat_enabled,
            owner: profile.owner
        });
    } catch (err) {
        console.error('Error fetching Gameflip status:', err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
            success: false,
            error: err.response?.data?.error?.message || err.message || 'Error al obtener estado de Gameflip'
        });
    }
}

export async function setGameflipOnline(req, res) {
    const user = req.user;
    const requestedAction = req.body?.action || 'online'; // 'online' or 'offline'
    try {
        const headers = getAuthHeaders(user);

        // 1. Fetch current profile
        const profileRes = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, { headers });
        const profile = profileRes.data?.data || {};

        const now = new Date();
        let onlineUntilDate = profile.online_until ? new Date(profile.online_until) : null;
        let isOnline = onlineUntilDate ? onlineUntilDate > now : false;

        // If requesting 'offline'
        if (requestedAction === 'offline') {
            let patchSucceeded = false;
            try {
                await axios.patch(
                    `${GAMEFLIP_API_BASE}/account/me/profile`,
                    [{ op: 'replace', path: '/online_until', value: new Date(Date.now() - 1000).toISOString() }],
                    {
                        headers: {
                            ...headers,
                            'Content-Type': 'application/json-patch+json'
                        }
                    }
                );
                isOnline = false;
                patchSucceeded = true;
            } catch {
                // Gameflip restricts direct online_until updates to mobile Cognito OAuth sessions
            }

            return res.json({
                success: true,
                isOnline,
                onlineUntil: patchSucceeded ? null : profile.online_until,
                remainingMs: isOnline && onlineUntilDate ? Math.max(0, onlineUntilDate.getTime() - Date.now()) : 0,
                displayName: profile.display_name || user.username,
                avatar: profile.avatar || null,
                requiresMobileAction: !patchSucceeded && isOnline,
                message: !isOnline
                    ? 'Tu cuenta ahora aparece como Desconectada.'
                    : 'Para aparecer desconectado en Gameflip, apaga el interruptor "Online" en la app móvil oficial, o espera a que expire tu tiempo actual.'
            });
        }

        // If requesting 'online' and not currently online, try to patch presence
        if (!isOnline) {
            try {
                const targetUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
                await axios.patch(
                    `${GAMEFLIP_API_BASE}/account/me/profile`,
                    [{ op: 'replace', path: '/online_until', value: targetUntil }],
                    {
                        headers: {
                            ...headers,
                            'Content-Type': 'application/json-patch+json'
                        }
                    }
                );
                isOnline = true;
                onlineUntilDate = new Date(targetUntil);
            } catch {
                // Gameflip restricts direct online_until updates to mobile Cognito OAuth sessions
            }
        }

        const remainingMs = isOnline && onlineUntilDate ? Math.max(0, onlineUntilDate.getTime() - Date.now()) : 0;

        return res.json({
            success: true,
            isOnline,
            onlineUntil: profile.online_until || null,
            remainingMs,
            displayName: profile.display_name || user.username,
            avatar: profile.avatar || null,
            requiresMobileActivation: !isOnline,
            message: isOnline
                ? '¡Tu cuenta está Online en Gameflip!'
                : 'Gameflip requiere activar el interruptor "Online" desde la aplicación móvil oficial (iOS/Android) una vez para otorgar la insignia verde. En cuanto lo actives en la app, se reflejará aquí inmediatamente.'
        });
    } catch (err) {
        console.error('Error in setGameflipOnline:', err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
            success: false,
            error: err.response?.data?.error?.message || err.message || 'Error al conectar con Gameflip'
        });
    }
}
