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
        };
    };
}

export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];

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
export function createServerSupabaseClient(
    Astro: any
): SupabaseClient<Database> {
    const accessToken = Astro.cookies.get("sb-access-token")?.value;
    const refreshToken = Astro.cookies.get("sb-refresh-token")?.value;

    const client = createClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                flowType: 'pkce',
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: true,
            },
        }
    );

    if (accessToken && refreshToken) {
        client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
    }

    return client;
}
