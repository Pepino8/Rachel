function SearchBar() {
  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="search"
        placeholder="Search..."
        className="my-4 w-full px-4 py-2 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
      />
    </div>
  );
}

export default SearchBar;
