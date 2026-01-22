import { supabase } from './supabase';

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
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Client has session -> Sync to Cookies
        const hasAccessToken = document.cookie.includes('sb-access-token');
        if (!hasAccessToken) {
            console.log('Restoring missing cookies from active client session');
            setCookie('sb-access-token', session.access_token, 60 * 60 * 24 * 7);
            setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7);
        }
    } else {
        // Client has NO session -> Try to recover from Cookies (Server State)
        const accessToken = getCookie('sb-access-token');
        const refreshToken = getCookie('sb-refresh-token');

        if (accessToken && refreshToken) {
            console.log('Restoring client session from cookies');
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error('Failed to restore session from cookies:', error);
                // Cookies might be invalid, verify if we should clear them?
                // For now, leave them, middleware handles server-side rejection.
            } else {
                console.log('Session restored successfully from cookies');
                // Force a UI update if needed, but the onAuthStateChange will trigger
            }
        }
    }
};

syncSession();

supabase.auth.onAuthStateChange((event, session) => {
    console.log(`Auth event: ${event}`);

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
            setCookie('sb-access-token', session.access_token, 60 * 60 * 24 * 7);
            setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7);
        }
    } else if (event === 'SIGNED_OUT') {
        deleteCookie('sb-access-token');
        deleteCookie('sb-refresh-token');
        // Check if we are on a protected route and redirect if needed?
        // But let's leave that to the user/middleware interaction to avoid jarring redirects
    }
});
