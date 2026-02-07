import { supabase } from './supabase';

// Guard against multiple executions
if ((window as any).__authSyncInitialized) {
    console.log('[Auth Sync] Already initialized, skipping duplicate setup');
} else {
    (window as any).__authSyncInitialized = true;
    
    const isSecure = window.location.protocol === 'https:';
    
    const setCookie = (name: string, value: string, maxAge: number) => {
        const cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;
        document.cookie = cookie;
    };
    
    const deleteCookie = (name: string) => {
        document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    };
    
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };
    
    // Bi-directional Sync
    const syncSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Client has session -> Sync to Cookies
                const hasAccessToken = document.cookie.includes('sb-access-token');
                if (!hasAccessToken) {
                    console.log('[Auth Sync] Restoring missing cookies from active client session');
                    setCookie('sb-access-token', session.access_token, 60 * 60 * 24 * 7);
                    setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7);
                }
            } else {
                // Client has NO session -> Try to recover from Cookies (Server State)
                const accessToken = getCookie('sb-access-token');
                const refreshToken = getCookie('sb-refresh-token');
                
                if (accessToken && refreshToken) {
                    console.log('[Auth Sync] Restoring client session from cookies');
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (error) {
                        console.error('[Auth Sync] Failed to restore session from cookies:', error);
                    } else {
                        console.log('[Auth Sync] Session restored successfully from cookies');
                    }
                }
            }
        } catch (error) {
            console.error('[Auth Sync] Error syncing session:', error);
        }
    };
    
    // Only call syncSession after a slight delay to avoid race conditions
    setTimeout(syncSession, 100);
    
    // Setup auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log(`[Auth Sync] Auth event: ${event}`);
        
        try {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    setCookie('sb-access-token', session.access_token, 60 * 60 * 24 * 7);
                    setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7);
                    console.log('[Auth Sync] Cookies updated from auth event');
                }
            } else if (event === 'SIGNED_OUT') {
                deleteCookie('sb-access-token');
                deleteCookie('sb-refresh-token');
                console.log('[Auth Sync] Cookies cleared on sign out');
            }
        } catch (error) {
            console.error('[Auth Sync] Error handling auth event:', error);
        }
    });
    
    // Cleanup on page unload
    const cleanup = () => {
        if (subscription) {
            subscription.unsubscribe();
            console.log('[Auth Sync] Subscription cleaned up');
        }
    };
    
    window.addEventListener('beforeunload', cleanup);
    
    // Also cleanup on visibility changes to prevent stale listeners
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('[Auth Sync] Page hidden, subscript still active');
        }
    });
}
