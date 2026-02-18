const STORAGE_KEY = 'eclat_guest_session_id';

/**
 * Generate a cryptographically secure UUID v4
 * Uses crypto.randomUUID() when available, otherwise crypto.getRandomValues()
 */
function generateUUID(): string {
    // Modern browsers support crypto.randomUUID()
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback: Use crypto.getRandomValues() for cryptographically secure random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Last resort fallback (should never happen in modern browsers)
    console.warn('[SessionManager] Crypto API not available, using Math.random()');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get current guest session ID or create a new one
 */
export function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''; // SSR safety

    let sessionId = localStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
        sessionId = generateUUID();
        localStorage.setItem(STORAGE_KEY, sessionId!);
    }

    return sessionId!;
}

/**
 * Clear guest session ID (e.g., after login/migration)
 */
export function clearSessionId() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get current session ID without creating (nullable)
 */
export function getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
}
