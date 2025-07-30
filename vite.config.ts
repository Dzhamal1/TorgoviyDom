import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфигурация Vite с оптимизациями для стабильной работы
export default defineConfig({
  plugins: [react()],
  
  // Подавление предупреждений в консоли разработки
  define: {
    __SENTRY_DEBUG__: false,
    __SENTRY_TRACING__: false,
  },
  
  // Оптимизация сборки и зависимостей
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'react-router-dom']
  },
  
  // Настройки сервера разработки
  server: {
    // Настройки для стабильного соединения
    host: true,
    port: 5173,
    strictPort: true,
    // Автоматическое открытие браузера
    open: false,
    // Настройки CORS для избежания сетевых ошибок
    cors: true,
    // Настройки прокси для API запросов (если нужно)
    proxy: {},
    // Исправление проблем с файловым наблюдателем
    watch: {
      usePolling: true,
      interval: 1000,
      // Игнорируем файлы, которые не нужно отслеживать
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.env',
        '**/.env.*'
      ]
    }
  },
  
  // Настройки сборки для продакшена
  build: {
    // Увеличиваем лимит размера чанков
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Оптимизация разделения кода
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  },
  
  // Настройки для предварительного просмотра
  preview: {
    port: 4173,
    host: true
  }
});
