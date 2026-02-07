import { useState, useEffect } from 'react';

interface WishlistButtonProps {
  productId: string;
  productName: string;
}

export default function WishlistButton({ productId, productName }: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load initial state
  useEffect(() => {
    const loadWishlistState = async () => {
      try {
        const response = await fetch('/api/wishlist', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 401) {
          // Not authenticated
          return;
        }

        if (response.ok) {
          const items = await response.json();
          setIsWishlisted(items.includes(productId));
        }
      } catch (error) {
        console.error('Error loading wishlist state:', error);
      }
    };

    loadWishlistState();
  }, [productId]);

  const handleToggle = async (e: MouseEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result.action === 'added') {
          setIsWishlisted(true);
          showNotification(`${productName} añadido a tu lista de deseos ❤️`, 'success');
        } else if (result.action === 'removed') {
          setIsWishlisted(false);
          showNotification(`${productName} eliminado de tu lista de deseos`, 'info');
        }
      } else {
        showNotification('Error al actualizar tu lista de deseos', 'error');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showNotification('Error al actualizar tu lista de deseos', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      class="p-2 hover:opacity-70 transition-opacity"
      title={isWishlisted ? 'Remover de deseos' : 'Añadir a deseos'}
      disabled={loading}
    >
      <svg
        class={`w-6 h-6 ${isWishlisted ? 'fill-black text-black' : 'text-black'}`}
        fill={isWishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}

function showNotification(message: string, type: 'success' | 'info' | 'error' = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;

  const bgColor =
    type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
