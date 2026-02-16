// Helper function to show notifications from any context (including .astro scripts)
export function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  // Create and dispatch custom event
  const event = new CustomEvent('show-notification', {
    detail: { message, type },
    bubbles: true,
    cancelable: true
  });
  
  document.dispatchEvent(event);
}

// Make it available globally for use in scripts
if (typeof window !== 'undefined') {
  (window as any).showNotification = showNotification;
}
