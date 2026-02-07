import { supabase } from './supabase';

if (typeof window !== 'undefined' && !(window as any).__authSyncInitialized) {
    (window as any).__authSyncInitialized = true;
    
    const isSecure = window.location.protocol === 'https:';
    
    const setCookie = (name: string, value: string, maxAge: number) => {
        const cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;
        document.cookie = cookie;
    };
    
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };
    
    // Only sync session on page load, not on every auth change
    const syncSessionOnLoad = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                const hasAccessToken = document.cookie.includes('sb-access-token');
                if (!hasAccessToken) {
                    console.log('[Auth Sync] Restoring cookies from session');
                    setCookie('sb-access-token', session.access_token, 60 * 60 * 24 * 7);
                    setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7);
                }
            } else {
                const accessToken = getCookie('sb-access-token');
                const refreshToken = getCookie('sb-refresh-token');
                
                if (accessToken && refreshToken) {
                    console.log('[Auth Sync] Attempting to restore session from cookies');
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                }
            }
        } catch (error) {
            console.error('[Auth Sync] Error in session sync:', error);
        }
    };
    
    // Execute on page load only
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncSessionOnLoad);
    } else {
        syncSessionOnLoad();
    }
}
