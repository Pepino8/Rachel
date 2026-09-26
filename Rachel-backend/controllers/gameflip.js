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
            error: err.response?.data?.error?.message || err.message || 'Failed to get Gameflip status'
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
                    ? 'Your account now appears as Offline.'
                    : 'To appear offline on Gameflip, turn off the "Online" switch in the official mobile app, or wait for your current session to expire.'
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
                ? 'Your account is Online on Gameflip!'
                : 'Gameflip requires turning on the "Online" switch from the official mobile app (iOS/Android) once to grant the green badge. As soon as you turn it on in the app, it will be reflected here immediately.'
        });
    } catch (err) {
        console.error('Error in setGameflipOnline:', err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
            success: false,
            error: err.response?.data?.error?.message || err.message || 'Failed to connect to Gameflip'
        });
    }
}
