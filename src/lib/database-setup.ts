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

// SQL скрипты для создания таблиц (на случай если нужно создать программно)
export const createTablesSQL = {
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS политики
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  `,
  
  cart_items: `
    CREATE TABLE IF NOT EXISTS cart_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_price DECIMAL(10,2) NOT NULL,
      product_image TEXT,
      product_category TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS политики
    ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage own cart items" ON cart_items
      FOR ALL USING (auth.uid() = user_id);
  `,
  
  orders: `
    CREATE TABLE IF NOT EXISTS orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      customer_address TEXT NOT NULL,
      items JSONB NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS политики
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own orders" ON orders
      FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
    
    CREATE POLICY "Anyone can create orders" ON orders
      FOR INSERT WITH CHECK (true);
  `,
  
  contact_messages: `
    CREATE TABLE IF NOT EXISTS contact_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      message TEXT NOT NULL,
      preferred_contact TEXT DEFAULT 'phone' CHECK (preferred_contact IN ('phone', 'whatsapp', 'telegram')),
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS политики
    ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Anyone can create contact messages" ON contact_messages
      FOR INSERT WITH CHECK (true);
  `
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