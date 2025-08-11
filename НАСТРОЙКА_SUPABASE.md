# Настройка Supabase для работы корзины

## 🔧 Шаг 1: Создание файла .env

Создайте файл `.env` в корне проекта (там же где package.json):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Как получить значения:

1. **VITE_SUPABASE_URL**: 
   - Откройте Supabase Dashboard
   - Перейдите в Settings → API
   - Скопируйте "Project URL"

2. **VITE_SUPABASE_ANON_KEY**:
   - В том же разделе Settings → API
   - Скопируйте "anon public" ключ

## 🔧 Шаг 2: Создание таблиц

Выполните SQL код в Supabase SQL Editor:

```sql
-- Создаем таблицу корзины
CREATE TABLE public.cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  product_image TEXT NOT NULL,
  product_category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);

-- Включаем RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Создаем политики
CREATE POLICY "Пользователи видят только свою корзину" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут добавлять в свою корзину" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свою корзину" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять из своей корзины" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);
```

## 🔧 Шаг 3: Перезапуск приложения

```bash
npm run dev
```

## ✅ Проверка работы

1. Откройте консоль браузера (F12)
2. Попробуйте добавить товар в корзину
3. Проверьте сообщения в консоли

### Ожидаемые сообщения:
- ✅ `Корзина загружена из Supabase: X товаров` - все работает
- ⚠️ `Supabase недоступен, используем localStorage` - работает без Supabase
- ❌ `Ошибка загрузки корзины из Supabase` - проблема с Supabase

## 🎯 Результат

После настройки корзина будет работать стабильно с синхронизацией между устройствами!
