import { useEffect } from 'react';
import { clearCart, removeCoupon } from '@/stores/cart';

export default function ClearCartOnSuccess() {
  useEffect(() => {
    // Clear cart and coupon from nanostores and localStorage
    console.log('[ClearCartOnSuccess] Clearing cart and coupon after successful purchase');
    clearCart();
    removeCoupon();
    
    // Extra confirmation
    setTimeout(() => {
      const cartData = localStorage.getItem('eclat-cart:');
      console.log('[ClearCartOnSuccess] Cart cleared:', !cartData);
    }, 100);
  }, []);

  // This component doesn't render anything
  return null;
}
