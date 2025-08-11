// Простой тест подключения к Supabase
import { supabase } from './supabase'

export const testSupabaseConnection = async () => {
  console.log('🧪 Простой тест подключения к Supabase...')
  
  try {
    // Проверяем переменные окружения
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    console.log('📋 Переменные окружения:')
    console.log('URL:', url ? '✅ Установлен' : '❌ НЕ УСТАНОВЛЕН')
    console.log('KEY:', key ? '✅ Установлен' : '❌ НЕ УСТАНОВЛЕН')
    
    if (!url || !key) {
      console.error('❌ ПРОБЛЕМА: Отсутствуют переменные окружения!')
      console.error('📝 Создайте файл .env в корне проекта')
      return { success: false, error: 'Отсутствуют переменные окружения' }
    }
    
    // Тестируем базовое подключение
    console.log('🔄 Тестируем подключение к Supabase...')
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Ошибка подключения:', error.message)
      console.error('Код ошибки:', error.status)
      
      if (error.message.includes('Invalid API key')) {
        console.error('🔑 ПРОБЛЕМА: Неверный API ключ')
        console.error('📝 Проверьте VITE_SUPABASE_ANON_KEY в файле .env')
      }
      if (error.message.includes('Invalid URL')) {
        console.error('🌐 ПРОБЛЕМА: Неверный URL')
        console.error('📝 Проверьте VITE_SUPABASE_URL в файле .env')
      }
      
      return { success: false, error: error.message }
    }
    
    console.log('✅ Подключение к Supabase успешно!')
    console.log('Сессия:', data.session ? 'Активна' : 'Отсутствует')
    
    // Тестируем таблицу cart_items
    console.log('🔄 Тестируем таблицу cart_items...')
    const { error: cartError } = await supabase
      .from('cart_items')
      .select('count')
      .limit(1)
    
    if (cartError) {
      console.error('❌ Проблема с таблицей cart_items:', cartError.message)
      if (cartError.code === '42P01') {
        console.error('📝 РЕШЕНИЕ: Таблица не существует. Выполните SQL из НАСТРОЙКА_SUPABASE.md')
      }
      return { success: false, error: 'Проблема с таблицей cart_items' }
    }
    
    console.log('✅ Таблица cart_items доступна!')
    console.log('🎉 Все тесты пройдены! Supabase работает корректно.')
    
    return { success: true }
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка тестирования:', message)
    return { success: false, error: message }
  }
}

// Автоматический запуск теста в режиме разработки
if (import.meta.env.DEV) {
  setTimeout(async () => {
    console.log('🚀 Запуск простого теста Supabase...')
    await testSupabaseConnection()
  }, 2000)
}
