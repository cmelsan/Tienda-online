import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

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
export const supabase: SupabaseClient<Database> = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
);

// Server-side Supabase client (for SSR pages)
export async function createServerSupabaseClient(
    context: any
): Promise<SupabaseClient<Database>> {
    // Extract cookies object - handle both Astro context and request context
    const cookies = context.cookies;
    
    if (!cookies || !cookies.get) {
        console.error('[Supabase] Invalid context passed to createServerSupabaseClient');
        throw new Error('cookies object required');
    }
    
    const accessTokenCookie = cookies.get("sb-access-token");
    const refreshTokenCookie = cookies.get("sb-refresh-token");
    
    const accessToken = accessTokenCookie?.value;
    const refreshToken = refreshTokenCookie?.value;
    
    console.log('[Supabase] Auth check - Access token present:', !!accessToken, 'Refresh token present:', !!refreshToken);

    const client = createClient<Database>(
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
        console.log('[Supabase] Setting session from cookies');
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
