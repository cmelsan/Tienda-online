-- ÉCLAT Beauty  Real Database Schema (Supabase)
-- WARNING: This schema is for reference only and is not meant to be run as-is.
-- Table order and constraints may not be valid for direct execution.

CREATE TABLE public.app_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  logo_url text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);

CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  session_id text UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL,
  category_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id uuid NOT NULL,
  images ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  brand_id uuid,
  subcategory_id uuid,
  is_flash_sale boolean DEFAULT false,
  flash_sale_discount numeric DEFAULT 0,
  flash_sale_end_time timestamp with time zone,
  is_bestseller boolean DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id),
  CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  subscribed_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  description text,
  discount_type character varying NOT NULL DEFAULT 'percentage'::character varying,
  discount_value numeric NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  min_purchase_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  applicable_categories ARRAY,
  is_active boolean DEFAULT true,
  valid_from timestamp without time zone DEFAULT now(),
  valid_until timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);

CREATE TABLE public.coupon_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  order_id uuid NOT NULL,
  user_id uuid,
  discount_applied numeric NOT NULL,
  used_at timestamp without time zone DEFAULT now(),
  CONSTRAINT coupon_usage_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  status character varying NOT NULL DEFAULT 'awaiting_payment'::character varying
    CHECK (status::text = ANY (ARRAY[
      'awaiting_payment'::character varying,
      'paid'::character varying,
      'shipped'::character varying,
      'delivered'::character varying,
      'cancelled'::character varying,
      'return_requested'::character varying,
      'returned'::character varying,
      'refunded'::character varying,
      'partially_returned'::character varying,
      'partially_refunded'::character varying
    ]::text[])),
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  shipping_address jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  guest_email character varying,
  delivered_at timestamp with time zone,
  return_deadline timestamp with time zone,
  customer_name character varying,
  return_initiated_at timestamp with time zone,
  return_deadline_at timestamp with time zone,
  return_address jsonb,
  return_reason text,
  order_number character varying NOT NULL UNIQUE,
  stripe_payment_intent_id character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  product_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_purchase integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  return_status character varying DEFAULT NULL::character varying
    CHECK (return_status IS NULL OR (return_status::text = ANY (ARRAY[
      'requested'::character varying,
      'approved'::character varying,
      'rejected'::character varying,
      'refunded'::character varying
    ]::text[]))),
  return_reason text,
  return_requested_at timestamp with time zone,
  return_processed_at timestamp with time zone,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  from_status character varying,
  to_status character varying NOT NULL,
  changed_by uuid,
  changed_by_type character varying
    CHECK (changed_by_type::text = ANY (ARRAY[
      'user'::character varying,
      'admin'::character varying,
      'system'::character varying
    ]::text[])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type character varying NOT NULL
    CHECK (type::text = ANY (ARRAY['invoice'::character varying, 'credit_note'::character varying]::text[])),
  invoice_number character varying NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  reference_invoice_id uuid,
  credit_note_scope character varying
    CHECK (credit_note_scope IS NULL OR (credit_note_scope::text = ANY (ARRAY[
      'full'::character varying,
      'partial'::character varying
    ]::text[]))),
  subtotal integer NOT NULL,
  tax_rate numeric DEFAULT 21,
  tax_amount integer NOT NULL,
  discount_amount integer DEFAULT 0,
  total_amount integer NOT NULL,
  customer_name character varying,
  customer_email character varying,
  customer_address jsonb,
  customer_nif character varying,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_refund_id character varying,
  issued_at timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT invoices_reference_invoice_id_fkey FOREIGN KEY (reference_invoice_id) REFERENCES public.invoices(id)
);

CREATE TABLE public.refunds_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  stripe_refund_id character varying,
  amount integer NOT NULL,
  admin_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT refunds_log_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  address_data jsonb NOT NULL,
  address_type character varying
    CHECK (address_type::text = ANY (ARRAY['shipping'::character varying, 'billing'::character varying]::text[])),
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.wishlist (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
