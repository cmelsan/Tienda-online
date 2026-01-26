const STORAGE_KEY = 'eclat_guest_session_id';

/**
 * Generate a UUID v4 compatible with all browsers
 */
function generateUUID(): string {
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
