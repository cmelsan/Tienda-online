const STORAGE_KEY = 'eclat_guest_session_id';

/**
 * Get current guest session ID or create a new one
 */
export function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''; // SSR safety

    let sessionId = localStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
        sessionId = crypto.randomUUID();
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
