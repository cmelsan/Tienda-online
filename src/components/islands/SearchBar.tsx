import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    price: number;
    brand: string | null;
}

// ─── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// ─── Price formatter ─────────────────────────────────────────────────────────
function formatPrice(price: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
    }).format(price);
}

export default function SearchBar() {
    const [isOpen, setIsOpen]       = useState(false);
    const [query, setQuery]         = useState('');
    const [results, setResults]     = useState<SearchResult[]>([]);
    const [loading, setLoading]     = useState(false);
    const [searched, setSearched]   = useState(false); // true once a fetch completed
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced query – fetch only fires 350 ms after the user stops typing
    const debouncedQuery = useDebounce(query, 350);

    // ── Body-scroll lock ────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ── Live search via API endpoint ────────────────────────────────────────
    useEffect(() => {
        const q = debouncedQuery.trim();
        if (q.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetch(`/api/search?q=${encodeURIComponent(q)}`)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) {
                    setResults(data.results ?? []);
                    setSearched(true);
                }
            })
            .catch(() => {
                if (!cancelled) setResults([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [debouncedQuery]);

    // ── Full-page search (Enter / submit) ───────────────────────────────────
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            window.location.href = `/busqueda?q=${encodeURIComponent(query.trim())}`;
            setIsOpen(false);
        }
    };

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSearched(false);
    }, []);

    const showDropdown  = isOpen && debouncedQuery.trim().length >= 2;
    const hasResults    = results.length > 0;
    const noResults     = searched && !loading && !hasResults;

    return (
        <>
            {/* ── Desktop trigger ─────────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(true)}
                className="hidden lg:flex items-center space-x-2 border-b border-transparent hover:border-white pb-0.5 cursor-pointer transition-colors focus:outline-none"
            >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Buscar</span>
            </button>

            {/* ── Mobile trigger ──────────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden text-white p-2"
                aria-label="Buscar"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>

            {/* ── Full-screen overlay ─────────────────────────────────────── */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-start pt-24 md:pt-32 animate-fadeIn">

                    {/* Close */}
                    <button
                        onClick={handleClose}
                        className="absolute top-8 right-8 text-white hover:text-gray-300 transition-colors p-2"
                        aria-label="Cerrar búsqueda"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* ── Search form ──────────────────────────────────────── */}
                    <form onSubmit={handleSearch} className="w-full max-w-4xl px-4" autoComplete="off">
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
                                spellCheck={false}
                            />

                            {/* Submit icon */}
                            <button
                                type="submit"
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                aria-label="Buscar"
                            >
                                {loading ? (
                                    /* Spinner while fetching */
                                    <svg className="w-8 h-8 md:w-10 md:h-10 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <p className="text-gray-500 text-center mt-4 text-sm uppercase tracking-widest">
                            Presiona Enter para buscar
                        </p>
                    </form>

                    {/* ── Live dropdown ────────────────────────────────────── */}
                    {showDropdown && (
                        <div className="w-full max-w-4xl px-4 mt-4 relative z-50">
                            <div className="bg-white rounded-lg shadow-2xl overflow-hidden relative z-50">

                                {/* Results list */}
                                {hasResults && (
                                    <ul>
                                        {results.map((item) => (
                                            <li key={item.id}>
                                                <a
                                                    href={`/productos/${item.slug}`}
                                                    onClick={handleClose}
                                                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="w-14 h-14 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name + brand */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-black truncate group-hover:text-rose-600 transition-colors">
                                                            {item.name}
                                                        </p>
                                                        {item.brand && (
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
                                                                {item.brand}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Price */}
                                                    <span className="text-sm font-bold text-black flex-shrink-0">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* No results */}
                                {noResults && (
                                    <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <p className="text-sm font-semibold uppercase tracking-widest">No encontrado</p>
                                        <p className="text-xs text-gray-300">Sin resultados para "<span className="italic">{debouncedQuery}</span>"</p>
                                    </div>
                                )}

                                {/* Footer: see all results */}
                                {hasResults && (
                                    <div className="border-t border-gray-100 px-5 py-3">
                                        <a
                                            href={`/busqueda?q=${encodeURIComponent(query.trim())}`}
                                            onClick={handleClose}
                                            className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                                        >
                                            <span>Ver todos los resultados</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
