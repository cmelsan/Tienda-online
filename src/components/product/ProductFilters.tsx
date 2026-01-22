import { useState, useEffect } from 'react';

interface ProductFiltersProps {
    minPriceObj: number;
    maxPriceObj: number;
    brands?: { id: string; name: string }[];
    categories?: { id: string; name: string }[];
    selectedBrands?: string[];
    selectedCategories?: string[];
    currentMinPrice: number;
    currentMaxPrice: number;
}

export default function ProductFilters({
    minPriceObj,
    maxPriceObj,
    brands = [],
    categories = [],
    selectedBrands = [],
    selectedCategories = [],
    currentMinPrice,
    currentMaxPrice
}: ProductFiltersProps) {
    // Local state for UI responsiveness
    const [priceRange, setPriceRange] = useState([currentMinPrice, currentMaxPrice]);
    const [checkedBrands, setCheckedBrands] = useState<string[]>(selectedBrands);
    const [checkedCategories, setCheckedCategories] = useState<string[]>(selectedCategories);
    const [isExpanded, setIsExpanded] = useState({
        brands: true,
        categories: true,
        price: true
    });

    // Update URL on change
    const updateUrl = (newBrands: string[], newCategories: string[], newPrice: number[]) => {
        const params = new URLSearchParams(window.location.search);

        // Brand params
        if (newBrands.length > 0) {
            params.set('brands', newBrands.join(','));
        } else {
            params.delete('brands');
        }

        // Category params
        if (newCategories.length > 0) {
            params.set('categories', newCategories.join(','));
        } else {
            params.delete('categories');
        }

        // Price params
        params.set('min_price', newPrice[0].toString());
        params.set('max_price', newPrice[1].toString());

        // Update URL without reload
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
        window.location.href = newUrl;
    };

    const handleBrandChange = (brandId: string) => {
        const newBrands = checkedBrands.includes(brandId)
            ? checkedBrands.filter(id => id !== brandId)
            : [...checkedBrands, brandId];

        setCheckedBrands(newBrands);
        updateUrl(newBrands, checkedCategories, priceRange);
    };

    const handleCategoryChange = (catId: string) => {
        const newCategories = checkedCategories.includes(catId)
            ? checkedCategories.filter(id => id !== catId)
            : [...checkedCategories, catId];

        setCheckedCategories(newCategories);
        updateUrl(checkedBrands, newCategories, priceRange);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setPriceRange([priceRange[0], val]);
    };

    // Debounce price update to avoid too many reloads
    const handlePriceCommit = () => {
        updateUrl(checkedBrands, checkedCategories, priceRange);
    };

    return (
        <div className="space-y-6">
            {/* Categories Filter (Only if categories are passed) */}
            {categories.length > 0 && (
                <div className="border-b border-gray-200 pb-6">
                    <h3
                        className="font-bold text-sm uppercase tracking-widest mb-4 flex justify-between cursor-pointer group"
                        onClick={() => setIsExpanded(prev => ({ ...prev, categories: !prev.categories }))}
                    >
                        Categoría
                        <svg className={`w-4 h-4 transform transition-transform ${isExpanded.categories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </h3>

                    {isExpanded.categories && (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {categories.map(cat => (
                                <label key={cat.id} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-black cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={checkedCategories.includes(cat.id)}
                                        onChange={() => handleCategoryChange(cat.id)}
                                        className="rounded border-gray-300 text-black focus:ring-black group-hover:border-black"
                                    />
                                    <span>{cat.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Brands Filter */}
            {brands.length > 0 && (
                <div className="border-b border-gray-200 pb-6">
                    <h3
                        className="font-bold text-sm uppercase tracking-widest mb-4 flex justify-between cursor-pointer group"
                        onClick={() => setIsExpanded(prev => ({ ...prev, brands: !prev.brands }))}
                    >
                        Marca
                        <svg className={`w-4 h-4 transform transition-transform ${isExpanded.brands ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </h3>

                    {isExpanded.brands && (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {brands.map(brand => (
                                <label key={brand.id} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-black cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={checkedBrands.includes(brand.id)}
                                        onChange={() => handleBrandChange(brand.id)}
                                        className="rounded border-gray-300 text-black focus:ring-black group-hover:border-black"
                                    />
                                    <span>{brand.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Price Filter */}
            <div className="border-b border-gray-200 pb-6">
                <h3
                    className="font-bold text-sm uppercase tracking-widest mb-4 flex justify-between cursor-pointer group"
                    onClick={() => setIsExpanded(prev => ({ ...prev, price: !prev.price }))}
                >
                    Precio
                    <svg className={`w-4 h-4 transform transition-transform ${isExpanded.price ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </h3>

                {isExpanded.price && (
                    <div className="px-2">
                        {/* Simple Range Input for Max Price */}
                        <div className="mb-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Máximo: {priceRange[1]}€</span>
                            <input
                                type="range"
                                min={minPriceObj}
                                max={maxPriceObj}
                                value={priceRange[1]}
                                onChange={handlePriceChange}
                                onMouseUp={handlePriceCommit} // Trigger on release
                                onKeyUp={(e) => e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? handlePriceCommit() : null}
                                className="w-full accent-black mt-2"
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{minPriceObj}€</span>
                            <span>{maxPriceObj}€+</span>
                        </div>
                    </div>
                )}
            </div>

            {(checkedBrands.length > 0 || checkedCategories.length > 0 || priceRange[1] < maxPriceObj) && (
                <button
                    onClick={() => {
                        window.location.href = window.location.pathname; // Clear query params
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-beauty-red underline"
                >
                    Limpiar Filtros
                </button>
            )}
        </div>
    );
}
