import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../src/config';
import ImageUploader from './ImageUploader';
import { useToast } from '../src/useToast';

function CreateImport({ onProductCreated }) {
    const { showToast } = useToast();
    const [create, setCreate] = useState(false);

    // Form States
    const [nombre, setNombre] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [autopost, setAutopost] = useState('yes');
    const [category, setCategory] = useState('ingame-item');
    const [imageFile, setImageFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Game & Fortnite Specific States
    const [game, setGame] = useState('');
    const [gameMode, setGameMode] = useState('Battle Royale');
    const [gameCategory, setGameCategory] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    // Import States
    const [showImport, setShowImport] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const resetForm = () => {
        setNombre('');
        setDesc('');
        setPrice('');
        setAutopost('yes');
        setCategory('ingame-item');
        setImageFile(null);
        setGame('');
        setGameMode('Battle Royale');
        setGameCategory('');
        setCategorySearch('');
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (!imageFile) {
            showToast('Please select a product image', 'warning');
            return;
        }

        setIsLoading(true);
        console.log('Sending product creation request with payload:', {
            nombre,
            desc,
            price,
            category,
            autopost,
            game,
            gameMode,
            gameCategory
        });

        try {
            // Generate product ID
            const productId = typeof window !== 'undefined' && window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : 'prod_' + Math.random().toString(36).substring(2, 15);

            const image = await fileToBase64(imageFile);

            // 1. Save product to local DB
            await axios.post(`${API_URL}/api/db/products`, {
                id: productId,
                name: nombre,
                description: desc,
                price: parseFloat(price),
                category: category,
                auto_post: autopost === 'yes',
                image,
                game: game || undefined,
                game_mode: game === 'Fortnite' ? gameMode : undefined,
                game_category: (game === 'Fortnite' && gameCategory) ? gameCategory : undefined
            });

            console.log('Successfully saved product to SQLite/Supabase DB:', productId);

            showToast('Product created successfully!', 'success');

            setCreate(false);
            resetForm();

            // Trigger parent refresh
            if (onProductCreated) {
                onProductCreated();
            }
        } catch (error) {
            console.error('Error creating product listing:', error.response?.data || error.message);
            showToast(`Error: ${error.response?.data?.error?.message || error.response?.data?.error || error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        
        if (!importUrl.trim()) {
            showToast('Please enter a Gameflip listing URL or ID', 'warning');
            return;
        }

        setIsImporting(true);
        console.log('Sending import request for URL:', importUrl);

        try {
            const response = await axios.post(`${API_URL}/api/db/products/import`, {
                url: importUrl
            });

            console.log('Successfully imported product:', response.data.product);
            showToast('Product imported successfully!', 'success');
            
            setShowImport(false);
            setImportUrl('');
            
            if (onProductCreated) {
                onProductCreated();
            }
        } catch (error) {
            console.error('Error importing product:', error.response?.data || error.message);
            const errMsg = error.response?.data?.error || error.message;
            showToast(`Import failed: ${errMsg}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const FORTNITE_CATEGORIES = [
        {
            id: 'Code',
            label: 'Code',
            badge: 'CODE',
            keywords: ['code', 'key', 'redeem', 'digital', 'promo', 'skin code', 'dlc'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="20" r="7" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M21 25L18 35H30L27 25" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    <circle cx="15" cy="23" r="5" fill="currentColor" />
                    <circle cx="15" cy="23" r="2.5" fill="#0d1424" />
                    <path d="M20 23H37" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M31 23V27M36 23V28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            )
        },
        {
            id: 'V-Bucks',
            label: 'V-Bucks',
            badge: 'CURRENCY',
            keywords: ['vbucks', 'v-bucks', 'currency', 'coin', 'money', 'bucks', 'gold', 'credits'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <ellipse cx="19" cy="33" rx="7.5" ry="3.5" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <ellipse cx="19" cy="29" rx="7.5" ry="3.5" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <ellipse cx="19" cy="25" rx="7.5" ry="3.5" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <ellipse cx="31" cy="33" rx="7" ry="3" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <ellipse cx="31" cy="29" rx="7" ry="3" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <ellipse cx="24" cy="18" rx="10" ry="5" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.25" />
                    <path d="M21 16L24 21L27 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            id: 'Weapon',
            label: 'Weapon',
            badge: 'WEAPON',
            keywords: ['weapon', 'gun', 'rifle', 'smg', 'pistol', 'shotgun', 'sniper', 'sword', 'nocturno'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M8 22H28V24H35V22H38V25H36V27H30V29L26 36H22L24 29H18L14 34H11L14 26H8V22ZM28 19H30V22H28V19ZM16 19H20V22H16V19ZM38 23H42V24H38V23Z" />
                </svg>
            )
        },
        {
            id: 'Ammo',
            label: 'Ammo',
            badge: 'AMMO',
            keywords: ['ammo', 'ammunition', 'bullet', 'bullets', 'cartridge', 'rounds', 'shells', 'energy'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <g transform="rotate(-15 18 25)">
                        <path d="M16 16C16 12 18 10 18 10C18 10 20 12 20 16V22H16V16Z" fill="currentColor" />
                        <rect x="15.5" y="22" width="5" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="#0d1424" />
                        <rect x="15" y="35" width="6" height="2" rx="0.5" fill="currentColor" />
                    </g>
                    <g>
                        <path d="M22 14C22 10 24 8 24 8C24 8 26 10 26 14V20H22V14Z" fill="currentColor" />
                        <rect x="21.5" y="20" width="5" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="#0d1424" />
                        <rect x="21" y="34" width="6" height="2" rx="0.5" fill="currentColor" />
                    </g>
                    <g transform="rotate(15 30 25)">
                        <path d="M28 16C28 12 30 10 30 10C30 10 32 12 32 16V22H28V16Z" fill="currentColor" />
                        <rect x="27.5" y="22" width="5" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="#0d1424" />
                        <rect x="27" y="35" width="6" height="2" rx="0.5" fill="currentColor" />
                    </g>
                </svg>
            )
        },
        {
            id: 'Trap',
            label: 'Trap',
            badge: 'TRAP',
            keywords: ['trap', 'traps', 'bear trap', 'gas trap', 'floor trap', 'broadside', 'sound wall', 'spikes'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <rect x="10" y="31" width="28" height="3" rx="1.5" fill="currentColor" />
                    <ellipse cx="24" cy="28" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.5" fill="#0d1424" />
                    <path d="M12 31C11 22 15 15 23 14L22 17L19 17L18 21L15 22L15 26L12 31Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
                    <path d="M36 31C37 22 33 15 25 14L26 17L29 17L30 21L33 22L33 26L36 31Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
                </svg>
            )
        },
        {
            id: 'Material',
            label: 'Material',
            badge: 'CRAFTING',
            keywords: ['material', 'crafting', 'sunbeam', 'brightcore', 'shadowshard', 'ore', 'crystal', 'wood', 'stone', 'metal', 'resources'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <path d="M24 10L37 17L24 24L11 17L24 10Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />
                    <path d="M11 17V31L24 38V24L11 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <path d="M11 23L17 26L15 29L20 32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M37 17V31L24 38V24L37 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <path d="M37 23L31 26L33 30L28 33" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            id: 'Custom',
            label: 'Custom',
            badge: 'CUSTOM',
            keywords: ['custom', 'request', 'order', 'special', 'book', 'contract', 'personalized'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <path d="M10 32C15 30 20 30 24 33C28 30 33 30 38 32V18C33 16 28 16 24 19C20 16 15 16 10 18V32Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
                    <path d="M24 19V33" stroke="currentColor" strokeWidth="2" />
                    <g transform="rotate(-35 26 22)">
                        <path d="M24 12L28 12L28 26L26 30L24 26V12Z" stroke="currentColor" strokeWidth="1.5" fill="#0d1424" />
                        <path d="M26 30L25 28H27L26 30Z" fill="currentColor" />
                    </g>
                </svg>
            )
        },
        {
            id: 'Bundle',
            label: 'Bundle',
            badge: 'BUNDLE',
            keywords: ['bundle', 'pack', 'package', 'set', 'combo', 'lot', 'collection', 'cubes'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <g transform="translate(-3, -5) scale(0.7)">
                        <path d="M24 12L34 17L24 22L14 17L24 12Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />
                        <path d="M14 17V27L24 32V22L14 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                        <path d="M34 17V27L24 32V22L34 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    </g>
                    <g transform="translate(17, -3) scale(0.7)">
                        <path d="M24 12L34 17L24 22L14 17L24 12Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />
                        <path d="M14 17V27L24 32V22L14 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                        <path d="M34 17V27L24 32V22L34 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    </g>
                    <g transform="translate(4, 7) scale(0.85)">
                        <path d="M24 12L34 17L24 22L14 17L24 12Z" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.4" />
                        <path d="M14 17V28L24 33V22L14 17Z" stroke="currentColor" strokeWidth="2.2" fill="#0d1424" />
                        <path d="M34 17V28L24 33V22L34 17Z" stroke="currentColor" strokeWidth="2.2" fill="#0d1424" />
                    </g>
                </svg>
            )
        },
        {
            id: 'Other',
            label: 'Other',
            badge: 'OTHER',
            keywords: ['other', 'misc', 'miscellaneous', 'mystery', 'random', 'gift', 'special'],
            icon: (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 48 48" fill="none">
                    <path d="M24 10L36 17L24 24L12 17L24 10Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />
                    <path d="M12 17V31L24 38V24L12 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <path d="M36 17V31L24 38V24L36 17Z" stroke="currentColor" strokeWidth="2" fill="#0d1424" />
                    <text x="17" y="28" fill="currentColor" fontSize="10" fontWeight="bold" fontFamily="sans-serif">?</text>
                    <text x="26" y="28" fill="currentColor" fontSize="10" fontWeight="bold" fontFamily="sans-serif">?</text>
                    <text x="21" y="19" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="sans-serif">?</text>
                </svg>
            )
        }
    ];

    const filteredFortniteCategories = FORTNITE_CATEGORIES.filter((cat) => {
        if (!categorySearch.trim()) return true;
        const q = categorySearch.toLowerCase().trim();
        return (
            cat.label.toLowerCase().includes(q) ||
            cat.badge.toLowerCase().includes(q) ||
            cat.keywords.some((k) => k.toLowerCase().includes(q))
        );
    });

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
            {/* Title Section */}
            <div className="border-b border-zinc-800/60 pb-4 mb-4">
                <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Product Actions</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Manage and import inventory items</p>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <button
                    onClick={() => setCreate(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Product
                </button>
                <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-700/80 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-300 font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Product
                </button>
            </div>

            {/* Create Product Modal overlay */}
            {create && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    {/* Modal Card */}
                    <form
                        onSubmit={handleCreate}
                        className={`bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full ${
                            game === 'Fortnite' ? 'max-w-3xl' : 'max-w-xl'
                        } max-h-[92vh] overflow-y-auto flex flex-col justify-start transition-all duration-300 animate-in zoom-in-95`}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-20">
                            <div className="flex items-center gap-2.5">
                                <span className="text-base font-bold tracking-tight text-zinc-100">Create Product</span>
                                {game && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        {game}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreate(false)}
                                className="text-zinc-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-zinc-800 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <div className="p-6 space-y-4">
                            {/* Product Name */}
                            <div>
                                <label htmlFor="nombre" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                    placeholder="Enter product name"
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                />
                            </div>

                            {/* Image Uploader */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Product Image
                                </label>
                                <ImageUploader key={create ? 'create-open' : 'create-closed'} onImageSelect={setImageFile} />
                            </div>

                            {/* Game Selector (Gameflip Catalog) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="game" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Game
                                    </label>
                                    <span className="text-[11px] text-zinc-500">Gameflip Catalog</span>
                                </div>
                                <select
                                    id="game"
                                    name="game"
                                    value={game}
                                    onChange={(e) => {
                                        const newGame = e.target.value;
                                        setGame(newGame);
                                        if (newGame !== 'Fortnite') {
                                            setGameCategory('');
                                        }
                                    }}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                >
                                    <option value="">-- Select Game (Optional) --</option>
                                    <optgroup label="Popular Games">
                                        <option value="Fortnite">Fortnite 🏆</option>
                                        <option value="Counter-Strike 2">Counter-Strike 2 (CS2)</option>
                                        <option value="Roblox">Roblox</option>
                                        <option value="Rocket League">Rocket League</option>
                                        <option value="Call of Duty">Call of Duty</option>
                                    </optgroup>
                                    <optgroup label="Other Gameflip Titles">
                                        <option value="Grand Theft Auto V">Grand Theft Auto V</option>
                                        <option value="Elden Ring">Elden Ring</option>
                                        <option value="Fallout 76">Fallout 76</option>
                                        <option value="Rust">Rust</option>
                                        <option value="Diablo IV">Diablo IV</option>
                                        <option value="League of Legends">League of Legends</option>
                                        <option value="Valorant">Valorant</option>
                                        <option value="World of Warcraft">World of Warcraft</option>
                                        <option value="Apex Legends">Apex Legends</option>
                                        <option value="Pokémon Scarlet / Violet">Pokémon Scarlet / Violet</option>
                                        <option value="Animal Crossing: New Horizons">Animal Crossing: New Horizons</option>
                                        <option value="Escape from Tarkov">Escape from Tarkov</option>
                                        <option value="Rainbow Six Siege">Rainbow Six Siege</option>
                                        <option value="Team Fortress 2">Team Fortress 2</option>
                                        <option value="Dota 2">Dota 2</option>
                                        <option value="Destiny 2">Destiny 2</option>
                                        <option value="Path of Exile">Path of Exile</option>
                                        <option value="Dead by Daylight">Dead by Daylight</option>
                                        <option value="Other">Other Game</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Fortnite Specific Options */}
                            {game === 'Fortnite' && (
                                <div className="space-y-4 p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 animate-in fade-in duration-300">
                                    {/* Game Mode Selector: Battle Royale vs Save the world */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                                                Game Mode
                                            </label>
                                            <span className="text-[11px] text-zinc-400">
                                                Selected: <strong className="text-emerald-400">{gameMode}</strong>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setGameMode('Battle Royale')}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                                    gameMode === 'Battle Royale'
                                                        ? 'bg-emerald-500/15 border-emerald-500/80 ring-2 ring-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
                                                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                <div
                                                    className={`p-2.5 rounded-lg ${
                                                        gameMode === 'Battle Royale'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-zinc-900 text-zinc-500'
                                                    }`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                                                        Battle Royale
                                                        {gameMode === 'Battle Royale' && (
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-zinc-400 mt-0.5">
                                                        PvP • Skins, Emotes, V-Bucks
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setGameMode('Save the world')}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                                    gameMode === 'Save the world'
                                                        ? 'bg-emerald-500/15 border-emerald-500/80 ring-2 ring-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
                                                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                <div
                                                    className={`p-2.5 rounded-lg ${
                                                        gameMode === 'Save the world'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-zinc-900 text-zinc-500'
                                                    }`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                                                        Save the world
                                                        {gameMode === 'Save the world' && (
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-zinc-400 mt-0.5">
                                                        PvE • Weapons, Traps, Materials
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Fortnite Game Items Grid with Search */}
                                    <div className="pt-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-extrabold text-sm tracking-wide text-zinc-100 uppercase">
                                                    GAME ITEMS — FORTNITE
                                                </h3>
                                                {gameCategory && (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                        {gameCategory}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Search Bar matching screenshot */}
                                            <div className="flex items-center w-full sm:w-64">
                                                <input
                                                    type="text"
                                                    value={categorySearch}
                                                    onChange={(e) => setCategorySearch(e.target.value)}
                                                    placeholder="Find specific items"
                                                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-l-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {}}
                                                    className="bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 rounded-r-lg text-xs font-semibold flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                    title="Search items"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 9 Circular Medallion Cards */}
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                                            {filteredFortniteCategories.map((item) => {
                                                const isSelected = gameCategory === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setGameCategory(isSelected ? '' : item.id)}
                                                        className={`group flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-emerald-500/15 border-emerald-500/80 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700'
                                                        }`}
                                                        title={`Select ${item.label}`}
                                                    >
                                                        {/* Medallion circle with metallic outer rim and inner badge */}
                                                        <div
                                                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-all duration-300 ${
                                                                isSelected
                                                                    ? 'bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.6)] scale-105'
                                                                    : 'bg-gradient-to-tr from-emerald-700/80 via-emerald-500 to-teal-700/80 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] group-hover:scale-102'
                                                            }`}
                                                        >
                                                            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0a2018] via-[#071712] to-[#040e0b] border border-emerald-500/60 flex flex-col items-center justify-center relative overflow-hidden">
                                                                {/* Top glossy reflection arc */}
                                                                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />

                                                                {/* Center Icon */}
                                                                <div className="mt-[-4px]">
                                                                    {item.icon}
                                                                </div>

                                                                {/* Subtitle tag / badge inside medallion */}
                                                                <div className="absolute bottom-1 px-1.5 py-[1px] rounded-full bg-[#03150f]/90 border border-emerald-500/80 shadow-inner">
                                                                    <span className="text-[7px] sm:text-[8px] font-black tracking-wider text-emerald-400 uppercase block leading-none">
                                                                        {item.badge}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Label underneath */}
                                                        <span
                                                            className={`mt-2 text-xs font-semibold tracking-wide transition-colors ${
                                                                isSelected ? 'text-emerald-400 font-bold' : 'text-zinc-300 group-hover:text-emerald-300'
                                                            }`}
                                                        >
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            {filteredFortniteCategories.length === 0 && (
                                                <div className="col-span-full py-6 text-center text-zinc-500 text-xs">
                                                    No item categories match &quot;{categorySearch}&quot;.
                                                    <button
                                                        type="button"
                                                        onClick={() => setCategorySearch('')}
                                                        className="ml-2 text-emerald-400 underline hover:text-emerald-300 cursor-pointer"
                                                    >
                                                        Clear search
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="desc" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Description
                                    </label>
                                    {game && (
                                        <span className="text-[11px] text-emerald-400/80 font-mono">
                                            [Game: {game}{game === 'Fortnite' ? ` | Mode: ${gameMode}` : ''}{game === 'Fortnite' && gameCategory ? ` | Type: ${gameCategory}` : ''}]
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    id="desc"
                                    name="desc"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    required
                                    placeholder="Enter description"
                                    rows="4"
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 resize-y"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label htmlFor="price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Price (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="price"
                                        name="price"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            {/* Autopost */}
                            <div>
                                <label htmlFor="autopost" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Autopost
                                </label>
                                <select
                                    id="autopost"
                                    name="autopost"
                                    value={autopost}
                                    onChange={(e) => setAutopost(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                >
                                    <option value="ingame-item">Ingame Item</option>
                                    <option value="video-dvd">Video DVD</option>
                                    <option value="video-game-console">Video Game Console</option>
                                    <option value="giftcard">Gift Card</option>
                                    <option value="unknown">Unknown</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Actions Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/60 sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm z-20">
                            <button
                                type="button"
                                onClick={() => setCreate(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:text-zinc-500 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            >
                                {isLoading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Import Product Modal overlay */}
            {showImport && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    {/* Modal Card */}
                    <form onSubmit={handleImportSubmit} className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md flex flex-col justify-start animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-900 z-10">
                            <span className="text-base font-bold tracking-tight text-zinc-100">Import Product</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImport(false);
                                    setImportUrl('');
                                }}
                                className="text-zinc-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-zinc-800 rounded-lg"
                                disabled={isImporting}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="importUrl" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Gameflip Listing URL or ID
                                </label>
                                <input
                                    type="text"
                                    id="importUrl"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    required
                                    placeholder="https://gameflip.com/item/..."
                                    disabled={isImporting}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                />
                                <p className="text-xs text-zinc-500 mt-2">
                                    Paste the link to any public Gameflip listing. The system will extract listing details and save it as a new product in your local catalog.
                                </p>
                            </div>
                        </div>

                        {/* Modal Actions Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/60 bg-zinc-900 z-10 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImport(false);
                                    setImportUrl('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors cursor-pointer"
                                disabled={isImporting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isImporting}
                                className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:text-zinc-500 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            >
                                {isImporting ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default CreateImport;