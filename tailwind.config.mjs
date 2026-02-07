/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                // Premium Sephora-Inspired Palette
                black: {
                    DEFAULT: '#000000',  // Negro puro (header, footer, CTAs)
                    soft: '#1a1a1a',     // Negro suave (hover states)
                    ui: '#111111',       // Negro UI (cards, paneles)
                },
                white: {
                    DEFAULT: '#FFFFFF',
                    off: '#F8F8F8',      // Blanco roto (fondos principales)
                    cream: '#FAF9F7',    // Crema suave (secciones alternadas)
                },
                gray: {
                    light: '#F0F0F0',    // Gris claro (separadores)
                    medium: '#8B8B8B',   // Gris medio (texto secundario)
                    dark: '#4A4A4A',     // Gris oscuro (labels)
                    border: '#E5E5E5',   // Gris bordes
                },
                beauty: {
                    red: '#ec4899',      // Rosa chicle (CTAs - en lugar de rojo)
                    pink: '#E8899E',     // Rosa suave (accents, hover)
                    gold: '#C9A962',     // Dorado lujo (badges premium)
                    nude: '#E8DCD5',     // Nude (fondos elegantes)
                },
                // Admin Dashboard Professional Palette
                admin: {
                    primary: '#3B82F6',      // Blue-500 - Acciones principales
                    'primary-dark': '#2563EB', // Blue-600 - Hover
                    success: '#10B981',      // Green-500 - Estados positivos
                    'success-dark': '#059669', // Green-600 - Hover
                    warning: '#F59E0B',      // Amber-500 - Alertas
                    'warning-dark': '#D97706', // Amber-600 - Hover
                    danger: '#EF4444',       // Red-500 - Errores/Crítico
                    'danger-dark': '#DC2626',  // Red-600 - Hover
                    bg: '#F9FAFB',           // Gray-50 - Fondo
                    card: '#FFFFFF',         // Blanco - Cards
                    border: '#E5E7EB',       // Gray-200 - Bordes
                    text: '#111827',         // Gray-900 - Texto principal
                    'text-muted': '#6B7280', // Gray-500 - Texto secundario
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Playfair Display', 'Georgia', 'serif'],
            },
            fontSize: {
                'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '300' }],
                'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
                'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '400' }],
                'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '30': '7.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'elegant': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 40px -10px rgba(0, 0, 0, 0.08)',
                'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                'card-hover': '0 10px 40px -10px rgba(0,0,0,0.15), 0 4px 15px -3px rgba(0,0,0,0.08)',
                'button': '0 2px 8px rgba(0,0,0,0.12)',
            },
            borderRadius: {
                'subtle': '2px',
                'soft': '4px',
                'card': '8px',
            },
            animation: {
                'fadeIn': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slideUp': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s',
                'slideRight': 'slideRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s',
                'scaleIn': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(30px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideRight: {
                    '0%': { width: '0', opacity: '0' },
                    '100%': { width: '100%', opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            transitionTimingFunction: {
                'elegant': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },
    plugins: [],
}
