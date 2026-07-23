import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../src/config';

function Login({ onLoginSuccess }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Client-side validations for registration
        if (isRegistering) {
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                setShouldShake(true);
                setTimeout(() => setShouldShake(false), 500);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters.');
                setShouldShake(true);
                setTimeout(() => setShouldShake(false), 500);
                return;
            }
        }

        setIsLoading(true);

        try {
            if (isRegistering) {
                const response = await axios.post(`${API_URL}/api/auth/register`, {
                    username,
                    password
                });

                if (response.data.success) {
                    setSuccessMessage('Registration successful! Logging in...');
                    localStorage.setItem('rachel_token', response.data.token);
                    localStorage.setItem('rachel_user', JSON.stringify(response.data.user));
                    setTimeout(() => {
                        onLoginSuccess();
                    }, 1200);
                }
            } else {
                const response = await axios.post(`${API_URL}/api/auth/login`, {
                    username,
                    password
                });

                if (response.data.success) {
                    localStorage.setItem('rachel_token', response.data.token);
                    localStorage.setItem('rachel_user', JSON.stringify(response.data.user));
                    onLoginSuccess();
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Could not complete the request.');
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 500);
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-emerald-500/5 rounded-full blur-[80px] sm:blur-[120px] -z-10 pointer-events-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-teal-500/5 rounded-full blur-[80px] sm:blur-[120px] -z-10 pointer-events-none animate-pulse duration-[10000ms]"></div>

            <div className={`w-full max-w-md transition-all duration-300 ${shouldShake ? 'animate-shake' : ''}`}>
                {/* Header branding */}
                <div className="flex flex-col items-center gap-3 mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-emerald-400/20">
                        <span className="text-zinc-950 font-black text-2xl tracking-tighter">R</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            Rachel
                        </h1>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/25 flex flex-col justify-start">
                    {/* Error Alerts */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 mb-6 flex items-center gap-2 animate-in fade-in duration-200">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 mb-6 flex items-center gap-2 animate-in fade-in duration-200">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                User
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    required
                                    disabled={isLoading}
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Password
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    disabled={isLoading}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (Registration only) */}
                        {isRegistering && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Confirm Password
                                </label>
                                <div className="relative rounded-xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{isRegistering ? 'Registering...' : 'Verifying...'}</span>
                                </>
                            ) : (
                                <>
                                    <span>{isRegistering ? 'Create Account' : 'Log In'}</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle View Link */}
                    <div className="text-center text-sm text-zinc-400 mt-6 animate-in fade-in duration-300">
                        {isRegistering ? (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => {
                                        setIsRegistering(false);
                                        setError('');
                                        setSuccessMessage('');
                                    }}
                                    className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Log In
                                </button>
                            </>
                        ) : (
                            <>
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => {
                                        setIsRegistering(true);
                                        setError('');
                                        setSuccessMessage('');
                                    }}
                                    className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Register here
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
