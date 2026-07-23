import { useState } from 'react';

function Header({ onLogout, currentTab, setCurrentTab }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo / Brand */}
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <span className="text-zinc-950 font-black text-lg">R</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Rachel
                    </h2>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    <button
                        onClick={() => setCurrentTab('dashboard')}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                            currentTab === 'dashboard'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                        }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setCurrentTab('settings')}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                            currentTab === 'settings'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                        }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={onLogout}
                        className="text-sm font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                    </button>
                </nav>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        type="button"
                        className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 focus:outline-none transition-colors duration-200"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                    >
                        <span className="sr-only">Open main menu</span>
                        {!isOpen ? (
                            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        ) : (
                            <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isOpen && (
                <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-2 pt-2 pb-4 space-y-1 sm:px-3 animate-in slide-in-from-top-2 duration-200">
                    <button
                        onClick={() => {
                            setCurrentTab('dashboard');
                            setIsOpen(false);
                        }}
                        className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 cursor-pointer ${
                            currentTab === 'dashboard'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/10'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => {
                            setCurrentTab('settings');
                            setIsOpen(false);
                        }}
                        className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 cursor-pointer ${
                            currentTab === 'settings'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/10'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                    >
                        Log Out
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;