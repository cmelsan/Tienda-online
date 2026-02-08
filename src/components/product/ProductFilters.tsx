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
        <div className="space-y-4">
            {/* Categories Filter (Only if categories are passed) */}
            {categories.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
                    <button
                        className="w-full flex items-center justify-between group"
                        onClick={() => setIsExpanded(prev => ({ ...prev, categories: !prev.categories }))}
                    >
                        <h3 className="font-bold text-sm uppercase tracking-widest text-black">
                            Categoría
                        </h3>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 group-hover:text-black ${isExpanded.categories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isExpanded.categories && (
                        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 max-h-64 overflow-y-auto custom-scrollbar">
                            {categories.map(cat => (
                                <label key={cat.id} className="flex items-center space-x-3 text-sm text-gray-600 hover:text-black cursor-pointer group transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={checkedCategories.includes(cat.id)}
                                        onChange={() => handleCategoryChange(cat.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-beauty-red focus:ring-beauty-red focus:ring-2 cursor-pointer"
                                    />
                                    <span className="group-hover:font-medium transition-all">{cat.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Brands Filter */}
            {brands.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
                    <button
                        className="w-full flex items-center justify-between group"
                        onClick={() => setIsExpanded(prev => ({ ...prev, brands: !prev.brands }))}
                    >
                        <h3 className="font-bold text-sm uppercase tracking-widest text-black">
                            Marca
                        </h3>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 group-hover:text-black ${isExpanded.brands ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isExpanded.brands && (
                        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 max-h-64 overflow-y-auto custom-scrollbar">
                            {brands.map(brand => (
                                <label key={brand.id} className="flex items-center space-x-3 text-sm text-gray-600 hover:text-black cursor-pointer group transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={checkedBrands.includes(brand.id)}
                                        onChange={() => handleBrandChange(brand.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-beauty-red focus:ring-beauty-red focus:ring-2 cursor-pointer"
                                    />
                                    <span className="group-hover:font-medium transition-all">{brand.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Price Filter */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-300">
                <button
                    className="w-full flex items-center justify-between group"
                    onClick={() => setIsExpanded(prev => ({ ...prev, price: !prev.price }))}
                >
                    <h3 className="font-bold text-sm uppercase tracking-widest text-black">
                        Precio
                    </h3>
                    <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 group-hover:text-black ${isExpanded.price ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isExpanded.price && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                        {/* Price Display */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-baseline justify-between">
                                <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Rango de precio</span>
                                <span className="text-2xl font-bold text-beauty-red">{priceRange[1]}€</span>
                            </div>
                        </div>

                        {/* Range Slider */}
                        <div>
                            <input
                                type="range"
                                min={minPriceObj}
                                max={maxPriceObj}
                                value={priceRange[1]}
                                onChange={handlePriceChange}
                                onMouseUp={handlePriceCommit}
                                onKeyUp={(e) => e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? handlePriceCommit() : null}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-beauty-red"
                            />
                        </div>

                        {/* Price Range Labels */}
                        <div className="flex justify-between text-xs text-gray-500 font-semibold">
                            <span>{minPriceObj}€</span>
                            <span>{maxPriceObj}€+</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Clear Filters Button */}
            {(checkedBrands.length > 0 || checkedCategories.length > 0 || priceRange[1] < maxPriceObj) && (
                <button
                    onClick={() => {
                        window.location.href = window.location.pathname;
                    }}
                    className="w-full bg-gray-100 hover:bg-beauty-red hover:text-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all duration-300 border border-gray-200 hover:border-beauty-red"
                >
                    ✕ Limpiar todos los filtros
                </button>
            )}
        </div>
    );
    );
}
