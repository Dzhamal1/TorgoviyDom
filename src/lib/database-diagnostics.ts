import { supabase } from './supabase'

// Функция для диагностики проблем с регистрацией
export const diagnoseDatabaseIssues = async () => {
  console.log('🔍 Запуск диагностики базы данных...')
  
  const issues = []
  
  try {
    // 1. Проверяем подключение к Supabase
    console.log('1️⃣ Проверяем подключение к Supabase...')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Ошибка подключения к Supabase:', sessionError.message)
      issues.push('Проблема с подключением к Supabase')
    } else {
      console.log('✅ Подключение к Supabase работает')
    }
    
    // 2. Проверяем существование таблицы profiles
    console.log('2️⃣ Проверяем таблицу profiles...')
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      if (profilesError.code === '42P01') {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Таблица profiles НЕ СУЩЕСТВУЕТ!')
        console.error('📝 РЕШЕНИЕ: Выполните команду создания таблицы из ИСПРАВЛЕНИЕ_РЕГИСТРАЦИИ.md')
        issues.push('Таблица profiles не существует')
      } else {
        console.error('❌ Ошибка доступа к таблице profiles:', profilesError.message)
        issues.push(`Проблема с таблицей profiles: ${profilesError.message}`)
      }
    } else {
      console.log('✅ Таблица profiles существует и доступна')
    }
    
    // 3. Проверяем другие необходимые таблицы
    console.log('3️⃣ Проверяем другие таблицы...')
    
    const tablesToCheck = ['orders', 'contact_messages', 'cart_items']
    
    for (const table of tablesToCheck) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        if (error.code === '42P01') {
          console.warn(`⚠️ Таблица ${table} не существует`)
          issues.push(`Таблица ${table} не существует`)
        } else {
          console.warn(`⚠️ Проблема с таблицей ${table}:`, error.message)
          issues.push(`Проблема с таблицей ${table}: ${error.message}`)
        }
      } else {
        console.log(`✅ Таблица ${table} существует`)
      }
    }
    
    // 4. Тестируем создание тестового профиля
    console.log('4️⃣ Тестируем операции с profiles...')
    
    try {
      // Попытка вставить тестовую запись (будет ошибка если нет прав)
      const testId = '00000000-0000-0000-0000-000000000000'
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: testId,
          email: 'test@example.com',
          full_name: 'Test User',
          phone: null
        }])
      
      if (insertError) {
        if (insertError.code === '23503') {
          console.log('✅ RLS политики работают (ожидаемая ошибка foreign key)')
        } else if (insertError.code === '42501') {
          console.error('❌ Нет прав на вставку в profiles')
          console.error('📝 РЕШЕНИЕ: Проверьте RLS политики из ИСПРАВЛЕНИЕ_РЕГИСТРАЦИИ.md')
          issues.push('Нет прав на вставку в profiles')
        } else {
          console.warn('⚠️ Неожиданная ошибка при тесте вставки:', insertError.message)
        }
      } else {
        // Если вставка прошла, удаляем тестовую запись
        await supabase.from('profiles').delete().eq('id', testId)
        console.log('✅ Операции с profiles работают')
      }
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании profiles:', error)
      issues.push('Критическая ошибка при тестировании profiles')
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error)
    issues.push('Критическая ошибка диагностики')
  }
  
  // Выводим резюме
  console.log('\n📋 РЕЗЮМЕ ДИАГНОСТИКИ:')
  
  if (issues.length === 0) {
    console.log('🎉 Все проверки пройдены! База данных настроена корректно.')
  } else {
    console.log('❌ Обнаружены следующие проблемы:')
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`)
    })
    console.log('\n📝 РЕШЕНИЕ: Выполните SQL команды из файла ИСПРАВЛЕНИЕ_РЕГИСТРАЦИИ.md')
  }
  
  return {
    success: issues.length === 0,
    issues
  }
}

// Функция для быстрого исправления (создание недостающих таблиц)
export const quickFixDatabase = async () => {
  console.log('🔧 Попытка быстрого исправления...')
  console.log('⚠️ ВНИМАНИЕ: Рекомендуется выполнить SQL команды вручную в Supabase Dashboard')
  
  // Здесь можно добавить автоматическое исправление через RPC функции
  // Но безопаснее выполнять SQL команды вручную
  
  return {
    success: false,
    message: 'Выполните SQL команды из ИСПРАВЛЕНИЕ_РЕГИСТРАЦИИ.md вручную'
  }
}