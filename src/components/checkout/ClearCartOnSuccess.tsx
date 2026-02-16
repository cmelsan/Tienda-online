import { useEffect } from 'react';
import { clearCart } from '@/stores/cart';

export default function ClearCartOnSuccess() {
  useEffect(() => {
    // Clear cart from nanostores and localStorage
    console.log('[ClearCartOnSuccess] Clearing cart after successful purchase');
    clearCart();
    
    // Extra confirmation
    setTimeout(() => {
      const cartData = localStorage.getItem('eclat-cart:');
      console.log('[ClearCartOnSuccess] Cart cleared:', !cartData);
    }, 100);
  }, []);

  // This component doesn't render anything
  return null;
}
