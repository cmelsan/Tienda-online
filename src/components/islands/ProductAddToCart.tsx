import { addToCart, isCartOpen } from '@/stores/cart';

interface ProductAddToCartProps {
    productId: string;
    productName: string;
    price: number;
    discountedPrice?: number;
    discount?: number;
    image?: string;
    slug: string;
    is_flash_sale?: boolean;
    flash_sale_discount?: number;
}

export default function ProductAddToCart({ productId, productName, price, discountedPrice, discount, image, slug, is_flash_sale, flash_sale_discount }: ProductAddToCartProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Calculate final price: use discountedPrice if available, else calculate from flash_sale_discount
            let finalPrice = price;
            if (discountedPrice) {
                finalPrice = discountedPrice;
            } else if (is_flash_sale && flash_sale_discount && flash_sale_discount > 0) {
                finalPrice = Math.round(price * (1 - flash_sale_discount / 100));
            }
            
            console.log('[ProductAddToCart] DEBUG:', {
                received_price: price,
                received_discountedPrice: discountedPrice,
                received_discount: discount,
                received_is_flash_sale: is_flash_sale,
                received_flash_sale_discount: flash_sale_discount,
                calculated_finalPrice: finalPrice,
            });

            addToCart(
                {
                    id: productId,
                    name: productName,
                    price: price,  // Keep original price
                    discountedPrice: finalPrice,  // Store the discounted price separately
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

    return (
        <button
            onClick={handleClick}
            className="w-full bg-black text-white font-bold text-sm uppercase py-3 hover:bg-gray-900 transition-all duration-300 shadow-md opacity-0 group-hover:opacity-100"
        >
            Añadir a la cesta
        </button>
    );
}
