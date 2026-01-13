/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                // MAC-Inspired Beauty Palette
                black: {
                    DEFAULT: '#000000',  // Negro principal (fondos, header, footer)
                    ui: '#111111',       // Negro suave UI (cards, admin, paneles)
                },
                white: {
                    DEFAULT: '#FFFFFF',
                    off: '#FAFAFA',      // Blanco roto (fondos principales)
                },
                gray: {
                    medium: '#9CA3AF',   // Gris medio (texto secundario)
                    dark: '#4B5563',     // Gris oscuro (labels, bordes)
                },
                beauty: {
                    red: '#C1121F',      // Rojo beauty (botones CTA, highlights)
                    pink: '#E11D48',     // Rosa maquillaje (hover, badges)
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Playfair Display', 'Georgia', 'serif'],
            },
            fontSize: {
                'display-xl': ['5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
                'display-lg': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
                'display-md': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
                'display-sm': ['2rem', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '700' }],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
