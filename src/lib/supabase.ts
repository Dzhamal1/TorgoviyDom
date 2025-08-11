import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения для Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Детальная диагностика переменных окружения
console.log('🔍 Диагностика Supabase конфигурации:')
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ НЕ УСТАНОВЛЕН')
console.log('ANON KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ НЕ УСТАНОВЛЕН')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют переменные окружения Supabase!')
  console.error('📝 Проверьте файл .env в корне проекта')
  console.error('📝 Убедитесь что переменные начинаются с VITE_')
  console.error('📝 Перезапустите сервер разработки после изменения .env')
  
  // Показываем пример правильного .env файла
  console.error('📝 Пример .env файла:')
  console.error('VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key-here')
  
  // Выбрасываем ошибку вместо создания заглушки
  throw new Error('Supabase не настроен. Создайте файл .env с переменными VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY')
}

// Создаем клиент Supabase с оптимальными настройками
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Настройки аутентификации для стабильной работы
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Отключаем для SPA
    debug: import.meta.env.DEV,
    flowType: 'pkce',
    // Настройки хранения сессии
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key)
        } catch (error) {
          console.warn('Ошибка чтения localStorage:', error)
          return null
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value)
        } catch (error) {
          console.warn('Ошибка записи localStorage:', error)
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key)
        } catch (error) {
          console.warn('Ошибка удаления localStorage:', error)
        }
      }
    }
  },
  // Глобальные настройки для надежного соединения
  global: {
    headers: {
      'X-Client-Info': 'construction-store-app',
    },
    // Настройки fetch с обработкой ошибок (не переопределяем заголовки SDK)
    fetch: (url, options: RequestInit = {}) => {
      console.log('🌐 Supabase запрос:', url)

      // Кроссбраузерный таймаут без изменения заголовков, которые ставит SDK
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const opts: RequestInit = { ...options, signal: controller.signal }

      return fetch(url, opts)
        .finally(() => clearTimeout(timeoutId))
        .catch((error: any) => {
        console.error('🌐 Ошибка сетевого соединения:', error.message)
        
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания соединения с сервером')
        }
        if (error.message.includes('ERR_CONNECTION_RESET')) {
          throw new Error('Соединение сброшено. Проверьте интернет-подключение')
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Не удается подключиться к серверу')
        }
        
        throw error
      })
    }
  },
  // Настройки для стабильной работы realtime (отключаем для экономии ресурсов)
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
})

// Тестирование перенесено в simple-test.ts

// Типы для базы данных
export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  is_admin?: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  product_name: string
  product_price: number
  product_image: string
  product_category: string
  quantity: number
  created_at: string
}

export interface ContactMessage {
  id: string
  name: string
  phone: string
  email?: string
  message: string
  preferred_contact: 'phone' | 'whatsapp' | 'telegram'
  status: 'new' | 'processed'
  created_at: string
}

export interface Order {
  id: string
  user_id?: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  items: any[]
  total_amount: number
  status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
}