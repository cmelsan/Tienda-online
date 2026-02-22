/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Window {
  userWishlist: string[];
  adminConfirm: (options?: { title?: string; message?: string; confirmLabel?: string }) => Promise<boolean>;
}

interface ImportMetaEnv {
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_PUBLISHABLE_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
