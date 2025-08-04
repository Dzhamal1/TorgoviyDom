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
  
  // Создаем заглушку для предотвращения критических ошибок
  throw new Error('Supabase не настроен. Проверьте файл .env')
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
    // Настройки fetch с обработкой ошибок
    fetch: (url, options = {}) => {
      console.log('🌐 Supabase запрос:', url)
      
      return fetch(url, {
        ...options,
        // Увеличиваем таймаут для медленных соединений
        signal: AbortSignal.timeout(15000),
        headers: {
          ...options.headers,
          'Connection': 'keep-alive',
        }
      }).catch(error => {
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

// Функция для безопасного тестирования соединения с детальной диагностикой
const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Тестирование соединения с Supabase...')
    
    // Проверяем базовое соединение
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error.message)
      console.error('Код ошибки:', error.status)
      
      if (error.message.includes('Invalid API key')) {
        console.error('🔑 РЕШЕНИЕ: Проверьте правильность VITE_SUPABASE_ANON_KEY в файле .env')
      }
      if (error.message.includes('Invalid URL')) {
        console.error('🌐 РЕШЕНИЕ: Проверьте правильность VITE_SUPABASE_URL в файле .env')
      }
      if (error.status === 401) {
        console.error('🔐 РЕШЕНИЕ: Проверьте настройки аутентификации в Supabase Dashboard')
      }
    } else {
      console.log('✅ Успешное подключение к Supabase')
      console.log('Текущая сессия:', data.session ? 'Активна' : 'Отсутствует')
      
      if (data.session) {
        console.log('👤 Пользователь:', data.session.user.email)
        console.log('🕐 Истекает:', new Date(data.session.expires_at * 1000).toLocaleString())
      }
    }
    
    // Проверяем доступность таблиц
    console.log('🔄 Проверяем доступность таблиц...')
    
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      console.error('❌ Таблица profiles недоступна:', profilesError.message)
      console.error('🔧 РЕШЕНИЕ: Выполните SQL миграции из DATABASE_SETUP.md')
    } else {
      console.log('✅ Таблица profiles доступна')
    }
    
    const { data: cartTest, error: cartError } = await supabase
      .from('cart_items')
      .select('count')
      .limit(1)
    
    if (cartError) {
      console.error('❌ Таблица cart_items недоступна:', cartError.message)
      console.error('🔧 РЕШЕНИЕ: Выполните SQL миграции из DATABASE_SETUP.md')
    } else {
      console.log('✅ Таблица cart_items доступна')
    }
    
  } catch (err) {
    console.error('❌ Критическая ошибка соединения:', err.message)
    
    if (err.message.includes('ERR_CONNECTION_RESET')) {
      console.error('🔄 РЕШЕНИЕ: Перезапустите приложение или проверьте интернет-соединение')
    }
    if (err.message.includes('Failed to fetch')) {
      console.error('🌐 РЕШЕНИЕ: Проверьте доступность supabase.co')
    }
  }
}

// Тестируем соединение с задержкой для избежания блокировки загрузки
// Отключаем автоматическое тестирование в продакшене для уменьшения логов
if (import.meta.env.DEV) {
  setTimeout(testSupabaseConnection, 2000)
}

// Типы для базы данных
export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
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