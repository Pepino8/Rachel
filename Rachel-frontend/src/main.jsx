import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Content from './Content.jsx'
import Header from './Header.jsx'
import Login from '../components/Login.jsx'
import Settings from '../components/Settings.jsx'
import axios from 'axios'
import { API_URL } from './config'
import { ToastProvider } from './ToastContext.jsx'

// Configure global Axios request interceptor to pass user session tokens
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('rachel_token');
    if (token) {
        config.headers.Authorization = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [hasDismissedWarning, setHasDismissedWarning] = useState(false);

    const fetchUserProfile = async () => {
        const token = localStorage.getItem('rachel_token');
        if (!token) return;
        try {
            const response = await axios.get(`${API_URL}/api/auth/me`);
            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (err) {
            console.error('Error fetching user profile in main:', err.message);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('rachel_token');
        if (token) {
            setIsAuthenticated(true);
            fetchUserProfile();
        }
    }, [isAuthenticated]);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        setCurrentTab('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('rachel_token');
        localStorage.removeItem('rachel_user');
        setUser(null);
        setHasDismissedWarning(false);
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    const shouldShowWarning = user && !user.hasGameflipLinked && !hasDismissedWarning && currentTab === 'dashboard';

    return (
        <>
            <Header onLogout={handleLogout} currentTab={currentTab} setCurrentTab={setCurrentTab} />
            {currentTab === 'dashboard' ? (
                <Content />
            ) : (
                <Settings onProfileUpdated={fetchUserProfile} />
            )}

            {/* Warning Popup Modal */}
            {shouldShowWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                        
                        {/* Top border ambient glow */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
                        
                        {/* Modal Body */}
                        <div className="p-6 flex flex-col items-center text-center">
                            
                            {/* Warning Icon Container with Glow */}
                            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 relative group">
                                <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-xl group-hover:bg-amber-500/15 transition-all duration-300"></div>
                                <svg className="w-8 h-8 text-amber-500 relative z-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            
                            {/* Text Content */}
                            <h3 className="text-xl font-extrabold text-zinc-100 tracking-tight mb-2">
                                Marketplace Credentials Required
                            </h3>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                                You haven't linked a <span className="text-amber-400 font-semibold">Gameflip API Key / TOTP Secret</span> to your account. 
                                To enable the Rachel autoposter features and start selling, please link your keys in your profile settings.
                            </p>
                            
                            {/* Actions */}
                            <div className="w-full flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        setHasDismissedWarning(true);
                                    }}
                                    className="w-full order-2 sm:order-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/50 transition-all duration-200 cursor-pointer text-center"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentTab('settings');
                                    }}
                                    className="w-full order-1 sm:order-2 px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:scale-[1.02] shadow-lg shadow-orange-950/20 hover:shadow-orange-500/20 transition-all duration-200 cursor-pointer text-center"
                                >
                                    Go to Settings
                                </button>
                            </div>
                        </div>
                        
                    </div>
                </div>
            )}
        </>
    );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
