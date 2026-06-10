import { useState, useEffect, useRef } from "react";
import axios from "axios";

function PostListings() {
    const [isPressed, setIsPressed] = useState(false);
    const [postedCount, setPostedCount] = useState(0);
    const [purgedCount, setPurgedCount] = useState(0);

    const postedCountRef = useRef(postedCount);
    useEffect(() => {
        postedCountRef.current = postedCount;
    }, [postedCount]);

    useEffect(() => {
        let intervalId;

        const performAutoPost = async () => {
            try {
                console.log("Auto-posting listing to Gameflip API...");
                const currentCount = postedCountRef.current;
                // Create a mock listing to simulate automatic posting
                const response = await axios.post("http://localhost:3000/api/listings", {
                    name: `Auto-Post Item #${currentCount + 1}`,
                    description: "Automatically posted by Rachel dashboard agent.",
                    price: "1.50",
                    category: "ingame-item"
                });
                
                console.log("Auto-post success:", response.data);
                setPostedCount(prev => prev + 1);
            } catch (error) {
                console.error("Auto-post failed:", error.response?.data || error.message);
            }
        };

        if (isPressed) {
            // Run once immediately
            performAutoPost();
            
            // Set interval to post every 60 seconds
            intervalId = setInterval(performAutoPost, 60000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPressed]);

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                <div>
                    <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Post Listings</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Automated marketplace agent</p>
                </div>
                {isPressed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                        Idle
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-400 leading-relaxed">
                {isPressed 
                    ? "Creating a new listing every minute and removing listings older than 1 day." 
                    : "Creates a new listing every minute and removes listings older than 1 day."}
            </p>   

            {/* Stats Dashboard */}
            {isPressed && (
                <div className="grid grid-cols-2 gap-4 mt-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 text-center transition-all duration-300 hover:border-zinc-700/50">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Posted</span>
                        <div className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-1">{postedCount}</div>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 text-center transition-all duration-300 hover:border-zinc-700/50">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Purged</span>
                        <div className="text-3xl font-extrabold text-amber-500 tracking-tight mt-1">{purgedCount}</div>
                    </div>
                </div>
            )}
                
            {/* Toggle Button */}
            <button
                onClick={() => setIsPressed(!isPressed)}
                className={`w-full mt-6 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
                    ${isPressed 
                        ? 'bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/20 hover:border-red-500/50 hover:text-red-300' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5'
                    }`}
            >
                {isPressed ? (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Stop Posting
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Auto Post Listings
                    </>
                )}
            </button>                        
        </div>
    );
}

export default PostListings;