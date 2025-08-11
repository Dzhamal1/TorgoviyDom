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

// Набор SQL (справочно) для создания таблиц — использовать вручную в Supabase
// ВНИМАНИЕ: эти строки предназначены только как подсказка и не выполняются напрямую из клиента
const createTablesSQL = {
  profiles: `
    create table if not exists public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      email text not null,
      full_name text not null,
      phone text,
      is_admin boolean default false,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now()
    );
  `,
  cart_items: `
    create table if not exists public.cart_items (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      product_id text not null,
      product_name text not null,
      product_price numeric not null,
      product_image text not null,
      product_category text not null,
      quantity integer not null check (quantity > 0),
      created_at timestamp with time zone default now()
    );
  `,
  orders: `
    create table if not exists public.orders (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references auth.users(id) on delete set null,
      customer_name text not null,
      customer_phone text not null,
      customer_email text,
      customer_address text not null,
      items jsonb not null,
      total_amount numeric not null,
      status text not null default 'new',
      created_at timestamp with time zone default now()
    );
  `,
  contact_messages: `
    create table if not exists public.contact_messages (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      phone text not null,
      email text,
      message text not null,
      preferred_contact text not null,
      status text not null default 'new',
      created_at timestamp with time zone default now()
    );
  `
} as const

// Функция для проверки всех необходимых таблиц
export const verifyDatabaseTables = async () => {
  console.log('🔍 Проверяем наличие таблиц в базе данных...')
  
  const requiredTables = [
    'profiles',
    'cart_items', 
    'orders',
    'contact_messages'
  ]
  
  const results = [] as Array<{ table: string; exists: boolean }>
  
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
    if ((createTablesSQL as Record<string, string>)[table]) {
      console.log(`🔄 Создаем таблицу ${table}...`)
      console.log('SQL:', (createTablesSQL as Record<string, string>)[table])
    }
  }
  
  return { success: false, message: 'Выполните SQL скрипты вручную в Supabase Dashboard' }
}