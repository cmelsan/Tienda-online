import { addToCart, isCartOpen } from '@/stores/cart';

interface ProductAddToCartProps {
    productId: string;
    productName: string;
    price: number;
    image?: string;
    slug: string;
}

export default function ProductAddToCart({ productId, productName, price, image, slug }: ProductAddToCartProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            console.log('[ProductAddToCart] Adding product:', {
                id: productId,
                name: productName,
                price,
            });

            addToCart(
                {
                    id: productId,
                    name: productName,
                    price,
                    image: image || '',
                    slug,
                    stock: 999,
                },
                1
            );

            // Open cart - update store AND dispatch event for legacy compatibility
            isCartOpen.set(true);
            window.dispatchEvent(new CustomEvent('toggle-cart'));
        } catch (error) {
            console.error('[ProductAddToCart] Error:', error);
        }
    };

    return (
        <button
            onClick={handleClick}
            className="w-full bg-black text-white font-bold text-sm uppercase py-3 hover:bg-gray-900 transition-all duration-300 shadow-md opacity-0 group-hover:opacity-100"
        >
            Añadir a la cesta
        </button>
    );
}
