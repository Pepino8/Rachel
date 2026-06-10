function SearchBar({ value, onChange }) {
  return (
    <div className="w-full relative my-2">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder="Search inventory..."
        className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700/60 focus:border-emerald-500/50 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
      />
    </div>
  );
}

export default SearchBar;
