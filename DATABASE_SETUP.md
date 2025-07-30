# Настройка базы данных для системы пользователей и уведомлений

## 1. Настройка Supabase

### Создание проекта
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Скопируйте URL проекта и анонимный ключ

### Настройка переменных окружения
Добавьте в файл `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Настройка аутентификации в Supabase Dashboard
1. Перейдите в Authentication → Settings
2. **КРИТИЧЕСКИ ВАЖНО - проверьте следующие настройки:**

#### **Настройки Email (Authentication → Settings → Email):**
- ✅ **Отключите "Enable email confirmations"** - снимите галочку с "Confirm email"
- ✅ **Или настройте SMTP** если хотите подтверждение email

#### **Настройки URL (Authentication → Settings → URL Configuration):**
- ✅ **Site URL:** `http://localhost:5173` (для разработки)
- ✅ **Redirect URLs:** добавьте `http://localhost:5173/**`
- ✅ **Для продакшена:** укажите ваш реальный домен

#### **Настройки безопасности (Authentication → Settings → Security):**
- ✅ **Enable signup:** должно быть включено
- ✅ **Enable manual linking:** можно отключить
- ✅ **Enable third-party logins:** отключите если не используете

#### **Проверка RLS политик:**
```sql
-- Убедитесь что эти политики существуют для таблицы profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## 2. Создание таблиц базы данных

Выполните следующие SQL команды в Supabase SQL Editor:

### Таблица профилей пользователей (если еще не создана)
**ВНИМАНИЕ: Если таблица `profiles` уже существует, пропустите этот блок и переходите к созданию триггера!**

```sql
-- Создание таблицы профилей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Автоматическое создание профилей через триггер (ОБЯЗАТЕЛЬНО ВЫПОЛНИТЬ)
**Выполните этот код даже если таблица `profiles` уже существует:**

```sql
-- Функция для создания профиля при регистрации пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Таблица корзины товаров (ПРОПУСТИТЬ ЕСЛИ УЖЕ СУЩЕСТВУЕТ)
**Если получаете ошибку "relation cart_items already exists", пропустите этот блок:**

```sql
-- Создание таблицы корзины
CREATE TABLE cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  product_image TEXT NOT NULL,
  product_category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Индексы для оптимизации
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
```

### Таблица сообщений обратной связи (ПРОПУСТИТЬ ЕСЛИ УЖЕ СУЩЕСТВУЕТ)
**Если получаете ошибку "relation contact_messages already exists", пропустите этот блок:**

```sql
-- Создание таблицы сообщений
CREATE TABLE contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  preferred_contact TEXT CHECK (preferred_contact IN ('phone', 'whatsapp', 'telegram')) DEFAULT 'phone',
  status TEXT CHECK (status IN ('new', 'processed')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Политика для администраторов (настроить отдельно)
CREATE POLICY "Admin can view all messages" ON contact_messages
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

### Таблица заказов (ПРОПУСТИТЬ ЕСЛИ УЖЕ СУЩЕСТВУЕТ)
**Если получаете ошибку "relation orders already exists", пропустите этот блок:**

```sql
-- Создание таблицы заказов
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all orders" ON orders
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Индексы
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

## 🚨 ВАЖНО: Если таблицы уже существуют

Если вы получаете ошибки типа `relation "table_name" already exists`, выполните **только этот минимальный код**:

```sql
-- КРИТИЧЕСКИ ВАЖНО: Проверка и создание всех необходимых компонентов

-- 1. Создание функции и триггера для автоматического создания профилей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. ОБЯЗАТЕЛЬНО: Включение RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. Проверка и создание недостающих политик RLS
-- Для profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Для cart_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' AND policyname = 'Users can manage own cart'
  ) THEN
    CREATE POLICY "Users can manage own cart" ON cart_items
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Для contact_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_messages' AND policyname = 'Admin can view all messages'
  ) THEN
    CREATE POLICY "Admin can view all messages" ON contact_messages
      FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- Для orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Users can view own orders'
  ) THEN
    CREATE POLICY "Users can view own orders" ON orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Admin can view all orders'
  ) THEN
    CREATE POLICY "Admin can view all orders" ON orders
      FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- 4. КРИТИЧЕСКИ ВАЖНО: Проверка работы auth.uid()
-- Выполните этот запрос для проверки функции auth.uid()
SELECT auth.uid() as current_user_id;

-- Если получаете NULL, значит пользователь не авторизован
-- Если получаете UUID, значит все работает правильно
```

## 3. Настройка Telegram уведомлений

### Создание Telegram бота
1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте токен бота

### Получение Chat ID
1. Добавьте бота в чат или напишите ему лично
2. Отправьте любое сообщение боту
3. Перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Найдите `chat.id` в ответе

### Настройка переменных для Edge Function
В настройках Supabase Edge Functions добавьте:
```
TELEGRAM_BOT_TOKEN=8487530034:AAHCxDJyFpF39zL2djWqw7WY1eH6TlYAKGM
TELEGRAM_CHAT_ID=1085519494
```

## 4. Развертывание Edge Function

Edge Function автоматически развертывается в Supabase. Убедитесь, что:
1. Функция находится в папке `supabase/functions/send-notification/`
2. Переменные окружения настроены в Supabase Dashboard

## 5. Тестирование системы

### Проверка аутентификации
1. Зарегистрируйте нового пользователя
2. Войдите в аккаунт
3. Проверьте создание профиля в таблице `profiles`

### Проверка корзины
1. Добавьте товары в корзину (требуется авторизация)
2. Проверьте сохранение в таблице `cart_items`
3. Выйдите и войдите снова - корзина должна восстановиться

### Проверка уведомлений
1. Отправьте сообщение через форму обратной связи
2. Оформите заказ
3. Проверьте получение уведомлений в Telegram

## 6. Безопасность

### Row Level Security (RLS)
- Все таблицы защищены RLS
- Пользователи видят только свои данные
- Администраторы имеют расширенные права

### Валидация данных
- Проверка типов данных на уровне базы
- Ограничения на значения полей
- Обязательные поля помечены NOT NULL

### Защита от спама
- Ограничение частоты отправки сообщений (можно добавить)
- Валидация email и телефонов
- Капча (можно добавить при необходимости)

## 7. Мониторинг и аналитика

### Просмотр логов
- Логи Edge Functions в Supabase Dashboard
- Мониторинг ошибок аутентификации
- Статистика использования API

### Резервное копирование
- Автоматические бэкапы Supabase
- Экспорт данных при необходимости