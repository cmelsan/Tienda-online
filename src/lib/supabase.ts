import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const DEBUG = import.meta.env.DEV;

// Database Types
export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    description?: string | null;
                    created_at?: string;
                };
            };
            products: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string;
                    price: number; // in cents
                    stock: number;
                    category_id: string;
                    images: string[];
                    created_at: string;
                    brand_id: string | null;
                    is_flash_sale: boolean;
                    flash_sale_discount: number | null;
                    flash_sale_end_time: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    description: string;
                    price: number;
                    stock: number;
                    category_id: string;
                    images?: string[];
                    created_at?: string;
                    brand_id?: string | null;
                    is_flash_sale?: boolean;
                    flash_sale_discount?: number | null;
                    flash_sale_end_time?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    description?: string;
                    price?: number;
                    stock?: number;
                    category_id?: string;
                    images?: string[];
                    created_at?: string;
                    brand_id?: string | null;
                    is_flash_sale?: boolean;
                    flash_sale_discount?: number | null;
                    flash_sale_end_time?: string | null;
                };
            };
            carts: {
                Row: {
                    id: string;
                    user_id: string | null;
                    session_id: string | null;
                    items: any; // JSONB
                    created_at: string;
                    updated_at: string;
                    expires_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    session_id?: string | null;
                    items?: any;
                    created_at?: string;
                    updated_at?: string;
                    expires_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    session_id?: string | null;
                    items?: any;
                    created_at?: string;
                    updated_at?: string;
                    expires_at?: string;
                };
            };
            user_addresses: {
                Row: {
                    id: string;
                    user_id: string;
                    address_data: any; // JSONB
                    address_type: 'shipping' | 'billing';
                    is_default: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    address_data: any;
                    address_type: 'shipping' | 'billing';
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    address_data?: any;
                    address_type?: 'shipping' | 'billing';
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            coupons: {
                Row: {
                    id: string;
                    code: string;
                    description: string | null;
                    discount_type: 'percentage' | 'fixed';
                    discount_value: number;
                    max_uses: number | null;
                    current_uses: number;
                    min_purchase_amount: number;
                    max_discount_amount: number | null;
                    applicable_categories: string[] | null;
                    is_active: boolean;
                    valid_from: string;
                    valid_until: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    description?: string | null;
                    discount_type?: 'percentage' | 'fixed';
                    discount_value: number;
                    max_uses?: number | null;
                    current_uses?: number;
                    min_purchase_amount?: number;
                    max_discount_amount?: number | null;
                    applicable_categories?: string[] | null;
                    is_active?: boolean;
                    valid_from?: string;
                    valid_until?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    description?: string | null;
                    discount_type?: 'percentage' | 'fixed';
                    discount_value?: number;
                    max_uses?: number | null;
                    current_uses?: number;
                    min_purchase_amount?: number;
                    max_discount_amount?: number | null;
                    applicable_categories?: string[] | null;
                    is_active?: boolean;
                    valid_from?: string;
                    valid_until?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    order_number: string | null;
                    user_id: string | null;
                    guest_email: string | null;
                    status: string;
                    total_amount: number;
                    items: any;
                    shipping_address: any;
                    billing_address: any | null;
                    stripe_checkout_session_id: string | null;
                    stripe_payment_intent_id: string | null;
                    coupon_code: string | null;
                    coupon_discount: number | null;
                    delivered_at: string | null;
                    return_deadline: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    order_number?: string | null;
                    user_id?: string | null;
                    guest_email?: string | null;
                    status?: string;
                    total_amount: number;
                    items?: any;
                    shipping_address?: any;
                    billing_address?: any | null;
                    stripe_checkout_session_id?: string | null;
                    stripe_payment_intent_id?: string | null;
                    coupon_code?: string | null;
                    coupon_discount?: number | null;
                    delivered_at?: string | null;
                    return_deadline?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    order_number?: string | null;
                    user_id?: string | null;
                    guest_email?: string | null;
                    status?: string;
                    total_amount?: number;
                    items?: any;
                    shipping_address?: any;
                    billing_address?: any | null;
                    stripe_checkout_session_id?: string | null;
                    stripe_payment_intent_id?: string | null;
                    coupon_code?: string | null;
                    coupon_discount?: number | null;
                    delivered_at?: string | null;
                    return_deadline?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            app_settings: {
                Row: { key: string; value: any };
                Insert: { key: string; value?: any };
                Update: { key?: string; value?: any };
            };
            brands: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    logo_url: string | null;
                    description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    logo_url?: string | null;
                    description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    logo_url?: string | null;
                    description?: string | null;
                    created_at?: string;
                };
            };
            subcategories: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    category_id: string;
                    description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    category_id: string;
                    description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    category_id?: string;
                    description?: string | null;
                    created_at?: string;
                };
            };
            invoices: {
                Row: {
                    id: string;
                    invoice_number: string;
                    order_id: string;
                    type: string;
                    amount: number;
                    pdf_url: string | null;
                    created_at: string;
                    [key: string]: any;
                };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            reviews: {
                Row: {
                    id: string;
                    product_id: string;
                    user_id: string | null;
                    rating: number;
                    comment: string | null;
                    created_at: string;
                    [key: string]: any;
                };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            wishlists: {
                Row: {
                    id: string;
                    user_id: string;
                    product_id: string;
                    created_at: string;
                };
                Insert: { id?: string; user_id: string; product_id: string; created_at?: string };
                Update: { id?: string; user_id?: string; product_id?: string; created_at?: string };
            };
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                    [key: string]: any;
                };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            item_returns: {
                Row: { id: string; order_id: string; [key: string]: any };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            refunds_log: {
                Row: { id: string; order_id: string; [key: string]: any };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            newsletter_subscribers: {
                Row: { id: string; email: string; [key: string]: any };
                Insert: { [key: string]: any };
                Update: { [key: string]: any };
            };
            // Catch-all for any other tables not explicitly typed
            [tableName: string]: {
                Row: Record<string, any>;
                Insert: Record<string, any>;
                Update: Record<string, any>;
            };
        };
        Functions: {
            [functionName: string]: {
                Args: Record<string, any>;
                Returns: any;
            };
        };
    };
}

export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Coupon = Database['public']['Tables']['coupons']['Row'];

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Client-side Supabase client
export const supabase: SupabaseClient<any> = createClient<any>(
    supabaseUrl,
    supabaseAnonKey
);

// Server-side Supabase client (for SSR pages)
export async function createServerSupabaseClient(
    context: any,
    isAdmin: boolean = false
): Promise<SupabaseClient<any>> {
    // Extract cookies object - handle both Astro context and request context
    const cookies = context.cookies;
    
    if (!cookies || !cookies.get) {
        console.error('[Supabase] Invalid context passed to createServerSupabaseClient');
        throw new Error('cookies object required');
    }
    
    // Use different cookie names for admin vs user sessions
    const accessTokenName = isAdmin ? 'sb-admin-access-token' : 'sb-access-token';
    const refreshTokenName = isAdmin ? 'sb-admin-refresh-token' : 'sb-refresh-token';
    
    const accessTokenCookie = cookies.get(accessTokenName);
    const refreshTokenCookie = cookies.get(refreshTokenName);
    
    const accessToken = accessTokenCookie?.value;
    const refreshToken = refreshTokenCookie?.value;
    
    if (DEBUG) {
        console.log(`[Supabase] Auth check (${isAdmin ? 'admin' : 'user'}) - Access token present:`, !!accessToken, 'Refresh token present:', !!refreshToken);
    }

    const client = createClient<any>(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                flowType: 'pkce',
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        }
    );

    if (accessToken && refreshToken) {
        if (DEBUG) {
            console.log(`[Supabase] Setting session from ${isAdmin ? 'admin' : 'user'} cookies`);
        }
        await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
    }

    return client;
}

// Order Management Helpers
export async function cancelOrder(orderId: string) {
    const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
    if (error) throw error;
    return data;
}

export async function requestReturn(orderId: string, reason: string) {
    const { data, error } = await supabase.rpc('request_return', {
        p_order_id: orderId,
        p_reason: reason
    });
    if (error) throw error;
    return data;
}
/**
 * Creates a Supabase client authenticated with a specific JWT access token.
 * Use this in API routes that receive the token via Authorization header.
 * The client acts as that user, so RLS policies apply correctly.
 */
export function createTokenClient(accessToken: string): SupabaseClient<any> {
    return createClient<any>(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * DEPRECATED: This function is unsafe and should not be used directly.
 * Use admin operations through validated API endpoints instead.
 * 
 * Server-side admin client using service role key (bypasses RLS)
 * SECURITY WARNING: This bypasses all Row Level Security policies.
 * Only use through validated admin API endpoints with proper authorization checks.
 * 
 * @deprecated Use admin API endpoints with proper auth validation instead
 */
export function getAdminSupabaseClient(): SupabaseClient<any> | null {
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
        console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not available, operations may be subject to RLS');
        return null;
    }

    // WARNING: This client bypasses ALL RLS policies
    // Caller MUST validate admin authorization before using
    return createClient<any>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

/**
 * Execute an operation with admin privileges (bypasses RLS)
 * REQUIRES: Valid admin session to be provided
 * 
 * @param session - Authenticated session (must be validated as admin)
 * @param operation - Async function that receives admin client
 * @returns Result of the operation
 * @throws Error if session is not from an admin user
 */
export async function executeAsAdmin<T>(
    session: any,
    operation: (adminClient: SupabaseClient<Database>) => Promise<T>
): Promise<T> {
    if (!session || !session.user) {
        throw new Error('Valid session required for admin operations');
    }

    // Validate admin status using regular client (respects RLS)
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

    if (!profile?.is_admin) {
        throw new Error('Unauthorized: Admin privileges required');
    }

    // Admin validated - create service role client
    const adminClient = getAdminSupabaseClient();
    if (!adminClient) {
        throw new Error('Admin client not available (missing service role key)');
    }

    if (DEBUG) {
        console.log('[Supabase] Admin operation authorized');
    }

    return await operation(adminClient);
}