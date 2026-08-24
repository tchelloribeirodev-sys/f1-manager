import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Deixa o app instalável ("Adicionar à tela inicial") no celular e no
    // desktop. autoUpdate: quando sobe uma versão nova, o service worker
    // troca sozinho no próximo carregamento, sem precisar desinstalar/
    // reinstalar nada.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png'],
      manifest: {
        name: 'Grid Manager',
        short_name: 'Grid Manager',
        description: 'Acompanhamento de campeonatos de F1 (jogo) — pilotos, equipes, resultados e recordes.',
        lang: 'pt-BR',
        theme_color: '#12161f',
        background_color: '#12161f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App 100% client-side com dados que mudam a todo momento no
        // Supabase — cachear só os arquivos estáticos da build (JS/CSS/
        // ícones) é suficiente pra abrir rápido; as consultas ao banco
        // continuam sempre indo direto pra rede, sem cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
});
