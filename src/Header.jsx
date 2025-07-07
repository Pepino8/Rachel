
function Header() {
    return(
    <header className="h-24 w-full bg-green-500 flex items-center justify-between px-8">
        <h2 className="text-7xl">Rachel</h2>
        <nav className="flex gap-8">
            <a href="#" className="text-7xl hover:bg-green-400 duration-200 rounded-sm"> Dashboard </a>
            <a href="#" className="text-7xl hover:bg-green-400 duration-200 rounded-sm"> Settings </a>
        </nav>
    </header> 
    );
}

export default Header