import { supabase } from './supabase'

// Функция для проверки существования таблицы
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    return !error
  } catch (error) {
    return false
  }
}

// Функция для проверки всех необходимых таблиц
export const verifyDatabaseTables = async () => {
  console.log('🔍 Проверяем наличие таблиц в базе данных...')
  
  const requiredTables = [
    'profiles',
    'cart_items', 
    'orders',
    'contact_messages'
  ]
  
  const results = []
  
  for (const table of requiredTables) {
    const exists = await checkTableExists(table)
    results.push({ table, exists })
    
    if (exists) {
      console.log(`✅ Таблица ${table} существует`)
    } else {
      console.error(`❌ Таблица ${table} НЕ существует`)
    }
  }
  
  const missingTables = results.filter(r => !r.exists).map(r => r.table)
  
  if (missingTables.length > 0) {
    console.error('❌ Отсутствуют следующие таблицы:', missingTables.join(', '))
    console.error('📝 Выполните SQL скрипты из файла DATABASE_SETUP.md')
    return { success: false, missingTables }
  }
  
  console.log('✅ Все необходимые таблицы существуют')
  return { success: true, missingTables: [] }
}


// Функция для создания отсутствующих таблиц (только для разработки)
export const createMissingTables = async (missingTables: string[]) => {
  console.log('⚠️ ВНИМАНИЕ: Попытка создания таблиц программно')
  console.log('📝 Рекомендуется выполнить SQL скрипты вручную в Supabase Dashboard')
  
  for (const table of missingTables) {
    if (createTablesSQL[table as keyof typeof createTablesSQL]) {
      console.log(`🔄 Создаем таблицу ${table}...`)
      console.log('SQL:', createTablesSQL[table as keyof typeof createTablesSQL])
    }
  }
  
  return { success: false, message: 'Выполните SQL скрипты вручную в Supabase Dashboard' }
}