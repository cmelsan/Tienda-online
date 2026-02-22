import { addToCart, isCartOpen } from '@/stores/cart';

interface ProductAddToCartProps {
    productId: string;
    productName: string;
    price: number;
    discountedPrice?: number;
    discount?: number;
    image?: string;
    slug: string;
    stock?: number;
    is_flash_sale?: boolean;
    flash_sale_discount?: number;
}

export default function ProductAddToCart({ productId, productName, price, discountedPrice, discount, image, slug, stock, is_flash_sale, flash_sale_discount }: ProductAddToCartProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            // PRIORIDAD: flash sale > discountedPrice (oferta destacada) > discount > precio base
            let finalPrice = price;
            if (is_flash_sale && flash_sale_discount && flash_sale_discount > 0) {
                finalPrice = Math.round(price * (1 - flash_sale_discount / 100));
            } else if (discountedPrice && discountedPrice > 0 && discountedPrice !== price) {
                finalPrice = discountedPrice;
            } else if (discount && discount > 0) {
                finalPrice = Math.round(price * (1 - discount / 100));
            }

            addToCart(
                {
                    id: productId,
                    name: productName,
                    price: finalPrice,  // Store as final price for calculations
                    originalPrice: price,  // EXPLICITLY store original price
                    discountedPrice: finalPrice,  // Also store as discountedPrice for consistency
                    discount: discount || 0,
                    is_flash_sale: is_flash_sale || false,
                    flash_sale_discount: flash_sale_discount || 0,
                    images: image ? [image] : [],
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

    if (stock !== undefined && stock <= 0) {
        return (
            <button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-bold text-sm uppercase py-3 cursor-not-allowed"
            >
                Agotado
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className="w-full bg-black text-white font-bold text-sm uppercase py-3 hover:bg-gray-900 transition-all duration-300 shadow-md opacity-0 group-hover:opacity-100"
        >
            Añadir a la cesta
        </button>
    );
}
