import { useState, useEffect, useRef } from 'react';

export default function SearchBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }

        // Prevent body scroll when open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            window.location.href = `/busqueda?q=${encodeURIComponent(query)}`;
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="hidden lg:flex items-center space-x-2 border-b border-transparent hover:border-white pb-0.5 group cursor-pointer transition-colors focus:outline-none"
            >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Buscar</span>
            </button>

            {/* Mobile Trigger (Icon only) - Optional integration if needed elsewhere or strictly replacing the desktop one */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden text-white p-2"
                aria-label="Buscar"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>

            {/* Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-8 right-8 text-white hover:text-gray-300 transition-colors p-2"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <form onSubmit={handleSearch} className="w-full max-w-4xl px-4">
                        <label htmlFor="search-input" className="sr-only">Buscar</label>
                        <div className="relative group">
                            <input
                                ref={inputRef}
                                id="search-input"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="BUSCAR PRODUCTOS, MARCAS..."
                                className="w-full bg-transparent border-b-2 border-gray-600 text-white text-3xl md:text-5xl font-bold py-6 px-4 focus:outline-none focus:border-white placeholder-gray-600 uppercase text-center tracking-widest transition-colors"
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-gray-500 text-center mt-6 text-sm uppercase tracking-widest">
                            Presiona Enter para buscar
                        </p>
                    </form>
                </div>
            )}
        </>
    );
}
