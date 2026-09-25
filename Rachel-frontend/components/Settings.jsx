import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../src/config';

const SPEED_PRESETS = [
    { label: '30s', value: 30, unit: 'seconds', ms: 30000, tag: 'Turbo' },
    { label: '1m', value: 1, unit: 'minutes', ms: 60000, tag: 'Standard' },
    { label: '2m', value: 2, unit: 'minutes', ms: 120000, tag: 'Balanced' },
    { label: '5m', value: 5, unit: 'minutes', ms: 300000, tag: 'Relaxed' },
    { label: '10m', value: 10, unit: 'minutes', ms: 600000, tag: 'Safe' },
    { label: '15m', value: 15, unit: 'minutes', ms: 900000, tag: 'Extended' }
];

const formatReadableInterval = (ms) => {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec === 60) return '1 min';
    const mins = sec / 60;
    if (Number.isInteger(mins)) return `${mins} mins`;
    return `${mins.toFixed(1)} mins (${sec}s)`;
};

function Settings({ onProfileUpdated }) {
    const [user, setUser] = useState(null);
    const [isEditingGameflip, setIsEditingGameflip] = useState(false);

    // Gameflip API inputs
    const [apiKey, setApiKey] = useState('');
    const [totpSecret, setTotpSecret] = useState('');

    // Account inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Users list (admin only)
    const [usersList, setUsersList] = useState([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [userActionError, setUserActionError] = useState('');
    const [userActionSuccess, setUserActionSuccess] = useState('');

    // Messages
    const [gameflipSuccess, setGameflipSuccess] = useState('');
    const [gameflipError, setGameflipError] = useState('');
    const [accountSuccess, setAccountSuccess] = useState('');
    const [accountError, setAccountError] = useState('');

    // Auto-Post Interval Settings
    const [postInterval, setPostInterval] = useState(60000);
    const [postValue, setPostValue] = useState(1);
    const [postUnit, setPostUnit] = useState('minutes');
    const [postSpeedSuccess, setPostSpeedSuccess] = useState('');
    const [postSpeedError, setPostSpeedError] = useState('');
    const [isSavingSpeed, setIsSavingSpeed] = useState(false);
    const [isLoadingGameflip, setIsLoadingGameflip] = useState(false);
    const [isLoadingAccount, setIsLoadingAccount] = useState(false);

    const fetchUsersList = useCallback(async () => {
        setIsFetchingUsers(true);
        setUserActionError('');
        try {
            const token = localStorage.getItem('rachel_token');
            const response = await axios.get(`${API_URL}/api/auth/users`, {
                headers: { Authorization: token }
            });
            if (response.data.success) {
                setUsersList(response.data.users);
            }
        } catch (err) {
            console.error('Error fetching users:', err.message);
            setUserActionError(err.response?.data?.error || 'Could not retrieve the user list.');
        } finally {
            setIsFetchingUsers(false);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        // 1. Initial read from localStorage for instant render
        const localInterval = localStorage.getItem('rachel_autopost_interval');
        const localUnit = localStorage.getItem('rachel_autopost_unit') || 'minutes';
        const localValue = localStorage.getItem('rachel_autopost_value');

        if (localInterval) {
            const ms = parseInt(localInterval, 10);
            if (!isNaN(ms) && ms >= 10000) {
                setPostInterval(ms);
                if (localValue) {
                    setPostValue(Number(localValue));
                    setPostUnit(localUnit);
                } else if (ms % 60000 === 0) {
                    setPostValue(ms / 60000);
                    setPostUnit('minutes');
                } else {
                    setPostValue(Math.round(ms / 1000));
                    setPostUnit('seconds');
                }
            }
        }

        // 2. Fetch and sync with backend API
        try {
            const token = localStorage.getItem('rachel_token');
            if (token) {
                const res = await axios.get(`${API_URL}/api/settings`, {
                    headers: { Authorization: token }
                });
                if (res.data?.success && res.data?.settings?.postInterval) {
                    const { postInterval: sInterval, postIntervalUnit: sUnit, postIntervalValue: sValue } = res.data.settings;
                    setPostInterval(sInterval);
                    const determinedUnit = sUnit || (sInterval % 60000 === 0 ? 'minutes' : 'seconds');
                    const determinedValue = sValue || (determinedUnit === 'minutes' ? sInterval / 60000 : Math.round(sInterval / 1000));
                    setPostUnit(determinedUnit);
                    setPostValue(determinedValue);

                    localStorage.setItem('rachel_autopost_interval', sInterval.toString());
                    localStorage.setItem('rachel_autopost_unit', determinedUnit);
                    localStorage.setItem('rachel_autopost_value', determinedValue.toString());
                }
            }
        } catch (err) {
            // Silently fallback to localStorage values
        }
    }, []);

    const fetchProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('rachel_token');
            const response = await axios.get(`${API_URL}/api/auth/me`, {
                headers: { Authorization: token }
            });
            if (response.data.success) {
                setUser(response.data.user);
                if (response.data.user.role === 'admin') {
                    fetchUsersList();
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err.message);
        }
    }, [fetchUsersList]);

    useEffect(() => {
        fetchProfile();
        fetchSettings();
    }, [fetchProfile, fetchSettings]);


    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? All their products, listings, and history will be deleted from the system.')) {
            return;
        }

        setUserActionError('');
        setUserActionSuccess('');

        try {
            const token = localStorage.getItem('rachel_token');
            const response = await axios.delete(`${API_URL}/api/auth/users/${userId}`, {
                headers: { Authorization: token }
            });

            if (response.data.success) {
                setUserActionSuccess(response.data.message);
                fetchUsersList();
            }
        } catch (err) {
            setUserActionError(err.response?.data?.error || 'Could not delete the user.');
        }
    };

    const handleSaveGameflip = async (e) => {
        e.preventDefault();
        setGameflipSuccess('');
        setGameflipError('');
        setIsLoadingGameflip(true);

        try {
            const token = localStorage.getItem('rachel_token');
            const response = await axios.post(`${API_URL}/api/auth/update-gameflip`, {
                apiKey,
                totpSecret
            }, {
                headers: { Authorization: token }
            });

            if (response.data.success) {
                setGameflipSuccess(response.data.message);
                setIsEditingGameflip(false);
                setApiKey('');
                setTotpSecret('');
                fetchProfile();
                if (onProfileUpdated) onProfileUpdated();
            }
        } catch (err) {
            setGameflipError(err.response?.data?.error || 'Could not save Gameflip credentials.');
        } finally {
            setIsLoadingGameflip(false);
        }
    };

    const handleSaveAccount = async (e) => {
        e.preventDefault();
        setAccountSuccess('');
        setAccountError('');

        if (password && password !== confirmPassword) {
            setAccountError('Passwords do not match.');
            return;
        }

        setIsLoadingAccount(true);

        try {
            const token = localStorage.getItem('rachel_token');
            const response = await axios.post(`${API_URL}/api/auth/update-profile`, {
                username: username || undefined,
                password: password || undefined,
                confirmPassword: confirmPassword || undefined
            }, {
                headers: { Authorization: token }
            });

            if (response.data.success) {
                setAccountSuccess('Profile updated successfully.');
                setUsername('');
                setPassword('');
                setConfirmPassword('');

                // Update local storage user details if username changed
                const localUser = JSON.parse(localStorage.getItem('rachel_user') || '{}');
                localUser.username = response.data.user.username;
                localStorage.setItem('rachel_user', JSON.stringify(localUser));

                fetchProfile();
            }
        } catch (err) {
            setAccountError(err.response?.data?.error || 'Could not update the account.');
        } finally {
            setIsLoadingAccount(false);
        }
    };

    const applyPreset = (preset) => {
        setPostValue(preset.value);
        setPostUnit(preset.unit);
        setPostInterval(preset.ms);
        setPostSpeedError('');
        setPostSpeedSuccess('');
    };

    const handleValueChange = (e) => {
        const val = e.target.value;
        setPostValue(val);
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
            const ms = postUnit === 'minutes' ? Math.round(num * 60000) : Math.round(num * 1000);
            setPostInterval(ms);
        }
        setPostSpeedError('');
    };

    const handleUnitChange = (newUnit) => {
        setPostUnit(newUnit);
        const num = Number(postValue);
        if (!isNaN(num) && num > 0) {
            const ms = newUnit === 'minutes' ? Math.round(num * 60000) : Math.round(num * 1000);
            setPostInterval(ms);
        }
    };

    const handleSavePostSpeed = async (e) => {
        if (e) e.preventDefault();
        setPostSpeedSuccess('');
        setPostSpeedError('');

        const num = Number(postValue);
        if (!num || isNaN(num) || num <= 0) {
            setPostSpeedError('Please enter a valid positive number.');
            return;
        }

        const calculatedMs = postUnit === 'minutes' ? Math.round(num * 60000) : Math.round(num * 1000);

        if (calculatedMs < 10000) {
            setPostSpeedError('Minimum interval is 10 seconds to protect your Gameflip account.');
            return;
        }
        if (calculatedMs > 86400000) {
            setPostSpeedError('Maximum interval is 24 hours (1440 minutes).');
            return;
        }

        setIsSavingSpeed(true);

        try {
            // Save to local storage
            localStorage.setItem('rachel_autopost_interval', calculatedMs.toString());
            localStorage.setItem('rachel_autopost_unit', postUnit);
            localStorage.setItem('rachel_autopost_value', num.toString());

            // Dispatch global event for instant reactivity in other components
            window.dispatchEvent(new CustomEvent('autopost_interval_changed', {
                detail: {
                    interval: calculatedMs,
                    unit: postUnit,
                    value: num
                }
            }));

            // Sync with backend API
            try {
                const token = localStorage.getItem('rachel_token');
                if (token) {
                    await axios.post(`${API_URL}/api/settings`, {
                        postInterval: calculatedMs,
                        postIntervalUnit: postUnit,
                        postIntervalValue: num
                    }, {
                        headers: { Authorization: token }
                    });
                }
            } catch (backendErr) {
                console.warn('Backend sync note:', backendErr.response?.data || backendErr.message);
            }

            setPostInterval(calculatedMs);
            setPostSpeedSuccess(`Posting interval saved! Rachel will post every ${formatReadableInterval(calculatedMs)}.`);
            setTimeout(() => setPostSpeedSuccess(''), 5000);
        } catch (err) {
            setPostSpeedError('Could not save posting speed settings.');
        } finally {
            setIsSavingSpeed(false);
        }
    };

    const handleResetDefaultSpeed = () => {
        setPostValue(1);
        setPostUnit('minutes');
        setPostInterval(60000);
        setPostSpeedError('');
        setPostSpeedSuccess('');
    };

    if (!user) {
        return (
            <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-zinc-950">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-zinc-400 font-medium">Loading configuration...</span>
                </div>
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    return (
        <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row items-center lg:items-start justify-center bg-zinc-950 gap-8 lg:gap-16 px-4 py-8 sm:px-6 lg:px-8 font-sans animate-in fade-in duration-300">

            {/* LEFT COLUMN: Settings Cards */}
            <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">

                {/* Admin Notice */}
                {isAdmin && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-sm text-amber-400 leading-relaxed shadow-lg shadow-black/20">
                        <div className="flex gap-2.5 items-start">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <span className="font-semibold block mb-1 text-amber-300">Global Administrator Mode</span>
                                You are logged into the administrator account. You can link your Gameflip credentials below. Editing username/password for the admin account must be done in the server <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-200 border border-zinc-800">.env</code> file.
                            </div>
                        </div>
                    </div>
                )}

                {/* GAMEFLIP API CARD */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                        <div>
                            <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Gameflip API</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Link your marketplace credentials</p>
                        </div>
                        {user.hasGameflipLinked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Linked
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                                None
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Linking a Gameflip account allows you to post listings to that account. Only one account can be linked at a time.
                        </p>

                        <button
                            type="button"
                            onClick={() => setIsEditingGameflip(!isEditingGameflip)}
                            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
                                ${isEditingGameflip
                                    ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
                                    : 'bg-[#d35400] hover:bg-[#e67e22] text-white shadow-lg shadow-orange-950/20 hover:shadow-orange-950/30'
                                }`}
                        >
                            Change Gameflip Account
                        </button>
                    </div>

                    {/* Gameflip Edit Form */}
                    {isEditingGameflip && (
                        <form onSubmit={handleSaveGameflip} className="mt-5 pt-5 border-t border-zinc-800/50 space-y-4 animate-in slide-in-from-top-3 duration-300">
                            {gameflipError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{gameflipError}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Gameflip API Key</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your Gameflip API Key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Gameflip TOTP Secret</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your Gameflip TOTP Secret"
                                        value={totpSecret}
                                        onChange={(e) => setTotpSecret(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingGameflip(false);
                                        setGameflipError('');
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoadingGameflip}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                                >
                                    {isLoadingGameflip ? 'Linking...' : 'Save API Account'}
                                </button>
                            </div>
                        </form>
                    )}

                    {gameflipSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 mt-4 flex items-center gap-2 animate-in fade-in duration-200">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{gameflipSuccess}</span>
                        </div>
                    )}
                </div>

                {/* ACCOUNT CARD */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                    <div className="border-b border-zinc-800/60 pb-4 mb-4">
                        <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Account Settings</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Configure your dashboard profile</p>
                    </div>

                    <form onSubmit={handleSaveAccount} className="space-y-5">
                        {accountError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{accountError}</span>
                            </div>
                        )}

                        {accountSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 flex items-center gap-2 animate-in fade-in duration-200">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{accountSuccess}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Change Username</label>
                            <p className="text-xs text-zinc-500 leading-relaxed mb-2">
                                You can use this name to log into AutoFlipper. Leave this empty to keep your old username.
                            </p>
                            <input
                                type="text"
                                disabled={isAdmin || isLoadingAccount}
                                placeholder="Unchanged"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-3 pt-4 border-t border-zinc-800/40">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Change Password</label>
                            <p className="text-xs text-zinc-500 leading-relaxed mb-2">
                                Leave this empty to keep your old password.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="password"
                                    disabled={isAdmin || isLoadingAccount}
                                    placeholder="Unchanged"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                                <input
                                    type="password"
                                    disabled={isAdmin || isLoadingAccount}
                                    placeholder="Repeat Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-3">
                            <button
                                type="submit"
                                disabled={isAdmin || isLoadingAccount}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-zinc-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isLoadingAccount ? 'Saving...' : 'Save Account Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT COLUMN: Admin Users or Session Info */}
            <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">
                {!isAdmin && (
                    /* User Info Panel (visible to regular users) */
                    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                        <div className="border-b border-zinc-800/60 pb-4 mb-4">
                            <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Active Session</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Your console credentials profile</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {/* Username row item */}
                            <div className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0">
                                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-500">Username</span>
                                        <span className="text-sm font-semibold text-zinc-200 mt-0.5">{user.username}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Gameflip Link row item */}
                            <div className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0">
                                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-500">Gameflip API</span>
                                        <span className="text-sm font-semibold text-zinc-200 mt-0.5">Link Status</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${user.hasGameflipLinked
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'
                                    }`}>
                                    {user.hasGameflipLinked ? 'Linked' : 'Not Linked'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* AUTO-POST SPEED & FREQUENCY CARD */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                        <div>
                            <h2 className="font-bold text-lg text-zinc-100 tracking-tight flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Auto-Post Speed
                            </h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Control how fast Rachel publishes new listings</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Every {formatReadableInterval(postInterval)}
                        </span>
                    </div>

                    <form onSubmit={handleSavePostSpeed} className="space-y-5">
                        {postSpeedError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{postSpeedError}</span>
                            </div>
                        )}

                        {postSpeedSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 flex items-center gap-2 animate-in fade-in duration-200">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{postSpeedSuccess}</span>
                            </div>
                        )}

                        {/* Quick Presets */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Quick Presets
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {SPEED_PRESETS.map((preset) => {
                                    const isSelected = postInterval === preset.ms && postUnit === preset.unit && Number(postValue) === preset.value;
                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-300'
                                            }`}
                                        >
                                            <span className="text-sm font-bold tracking-tight">{preset.label}</span>
                                            <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                                                {preset.tag}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Interval Input */}
                        <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Custom Interval
                            </label>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Set the exact time the bot waits before publishing each listing from your active products inventory.
                            </p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={postValue}
                                        onChange={handleValueChange}
                                        placeholder="e.g. 60"
                                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-xl text-sm font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    />
                                </div>
                                <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => handleUnitChange('seconds')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                            postUnit === 'seconds'
                                                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        Seconds
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUnitChange('minutes')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                            postUnit === 'minutes'
                                                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        Minutes
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Live Impact & Estimation Box */}
                        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Estimated Posting Rate:
                                </span>
                                <span className="font-bold text-zinc-200">
                                    ~{Math.round((3600 / Math.max(1, Math.round(postInterval / 1000))) * 10) / 10} posts / hour
                                </span>
                            </div>

                            {/* Dynamic Status / Warning Indicator */}
                            {Math.round(postInterval / 1000) < 30 ? (
                                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>High speed: Intervals under 30s may hit Gameflip API rate limits.</span>
                                </div>
                            ) : Math.round(postInterval / 1000) <= 300 ? (
                                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Recommended: Good balance between marketplace visibility and API limits.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Conservative: Ideal for smaller inventories or avoiding rapid relisting.</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={handleResetDefaultSpeed}
                                className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                            >
                                Reset to Default (1m)
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingSpeed}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
                            >
                                {isSavingSpeed ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Save Auto-Post Speed
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 24-HOUR AUTO-PURGE MAINTENANCE CARD */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                        <div>
                            <h2 className="font-bold text-lg text-zinc-100 tracking-tight flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                24-Hour Listing Auto-Purge
                            </h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Autonomous background inventory maintenance</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active (24h)
                        </span>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Rachel runs an automated background agent every 15 minutes. Any listing that has been published for <span className="text-amber-400 font-semibold">24 hours or more</span> is automatically removed from Gameflip to prevent stale posts and free up marketplace inventory space.
                        </p>

                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 block">Expiration Rule</span>
                                    <span className="text-sm font-semibold text-zinc-200">24 Hours Max Listing Lifetime</span>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-center">
                                Background Daemon Running
                            </span>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    /* ADMIN USERS LIST SECTION */
                    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
                        <div className="border-b border-zinc-800/60 pb-4 mb-4">
                            <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Registered Users</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Manage console access accounts</p>
                        </div>

                        {userActionError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{userActionError}</span>
                            </div>
                        )}

                        {userActionSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 mb-4 flex items-center gap-2 animate-in fade-in duration-200">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{userActionSuccess}</span>
                            </div>
                        )}

                        {isFetchingUsers ? (
                            <div className="flex items-center justify-center py-6 text-zinc-500 text-sm gap-2">
                                <svg className="animate-spin h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Loading user list...</span>
                            </div>
                        ) : usersList.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-6">
                                No registered users found in the system.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {usersList.map((usr) => (
                                    <div key={usr.id} className="w-full bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/50 hover:bg-zinc-900/40 rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            {/* Initial Avatar circle */}
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold flex-shrink-0 text-sm tracking-tight shadow-sm">
                                                {usr.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="text-sm font-semibold text-zinc-100">{usr.username}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-zinc-550">{usr.id.slice(0, 8)}...</span>
                                                    <span className="text-zinc-800">•</span>
                                                    <span className="text-[10px] text-zinc-500">{usr.created_at}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteUser(usr.id)}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/20 hover:border-red-500/50 hover:text-red-300 transition-all duration-200 cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Settings;
