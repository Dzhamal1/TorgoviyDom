import { supabase } from './supabase'

// Тестовая функция для проверки Telegram уведомлений
export const testTelegramNotification = async () => {
  try {
    console.log('🧪 Тестируем Telegram уведомления...')
    
    const testData = {
      type: 'contact' as const,
      data: {
        name: 'Тестовый пользователь',
        phone: '+7 (900) 123-45-67',
        email: 'test@example.com',
        message: 'Это тестовое сообщение для проверки Telegram уведомлений',
        preferredContact: 'telegram' as const,
        timestamp: new Date().toLocaleString('ru-RU')
      }
    }

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: testData
    })

    if (error) {
      console.error('❌ Ошибка тестирования Telegram:', error)
      return { success: false, error }
    }

    console.log('✅ Telegram тест успешен:', data)
    return { success: true, data }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка тестирования Telegram:', message)
    return { success: false, error: message }
  }
}

// Функция для проверки переменных окружения
export const checkTelegramConfig = () => {
  console.log('🔍 Проверка конфигурации Telegram...')
  console.log('Для настройки Telegram уведомлений:')
  console.log('1. Создайте бота через @BotFather')
  console.log('2. Добавьте в Supabase Dashboard → Settings → Environment Variables:')
  console.log('   TELEGRAM_BOT_TOKEN=ваш_токен_бота')
  console.log('   TELEGRAM_CHAT_ID=ваш_chat_id')
  console.log('3. Разверните Edge Function: supabase functions deploy send-notification')
}
