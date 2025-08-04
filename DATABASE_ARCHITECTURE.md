# 🏗️ Архитектура базы данных Supabase

## 📊 Обзор таблиц

Наша база данных состоит из 4 основных таблиц, каждая из которых выполняет специфическую роль в системе электронной коммерции:

### 1. 👤 **Таблица `profiles`**
**Назначение**: Хранение дополнительной информации о пользователях

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Ключевые особенности:**
- `id` связан с встроенной таблицей `auth.users` Supabase
- Автоматически создается при регистрации пользователя через триггер
- Содержит расширенную информацию профиля (имя, телефон)

**RLS Политики:**
- Пользователи видят только свой профиль
- Могут обновлять только свои данные

---

### 2. 🛒 **Таблица `cart_items`**
**Назначение**: Персональная корзина покупок для авторизованных пользователей

```sql
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
```

**Логика работы:**
1. **Для авторизованных пользователей**: Корзина сохраняется в БД и синхронизируется между устройствами
2. **Для гостей**: Корзина хранится только в localStorage браузера
3. **При входе в аккаунт**: Корзина из localStorage может быть объединена с корзиной из БД

**Почему могут отсутствовать данные:**
- Пользователь добавлял товары как гость (до авторизации)
- Ошибки сети при сохранении в БД
- Проблемы с RLS политиками
- Пользователь очистил корзину

**RLS Политики:**
- Пользователи управляют только своей корзиной
- Полный доступ (SELECT, INSERT, UPDATE, DELETE)

---

### 3. 📞 **Таблица `contact_messages`**
**Назначение**: Сообщения обратной связи от клиентов

```sql
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
```

**Особенности:**
- Доступна для неавторизованных пользователей
- Автоматические уведомления в Telegram/Email
- Статусы для отслеживания обработки

**RLS Политики:**
- Только администраторы могут просматривать сообщения
- Публичная вставка (INSERT) для отправки сообщений

---

### 4. 🛍️ **Таблица `orders`**
**Назначение**: Заказы клиентов с полной информацией

```sql
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
```

**Структура поля `items` (JSONB):**
```json
[
  {
    "id": "1",
    "name": "Цемент М400 50кг",
    "price": 320,
    "quantity": 2,
    "category": "Стройматериалы",
    "total": 640
  }
]
```

**Логика статусов:**
- `new` → `confirmed` → `processing` → `shipped` → `delivered`
- `cancelled` - может быть установлен на любом этапе

**RLS Политики:**
- Пользователи видят только свои заказы
- Администраторы видят все заказы
- Гости могут создавать заказы (user_id = NULL)

---

## 🔗 Связи между таблицами

```
auth.users (Supabase встроенная)
    ↓ (1:1)
profiles
    ↓ (1:many)
cart_items
    ↓ (1:many)
orders
```

### Каскадные операции:
- **Удаление пользователя** → удаляются профиль и корзина, заказы остаются (user_id = NULL)
- **Очистка корзины** → не влияет на заказы
- **Заказы независимы** от корзины после создания

---

## 🔒 Система безопасности (RLS)

### Row Level Security включен для всех таблиц:

1. **profiles**: Пользователи видят только свои данные
2. **cart_items**: Пользователи управляют только своей корзиной  
3. **contact_messages**: Только админы читают, все могут создавать
4. **orders**: Пользователи видят свои заказы, админы - все

### Политики для администраторов:
```sql
-- Проверка роли администратора
auth.jwt() ->> 'role' = 'admin'
```

---

## 🚀 Триггеры и автоматизация

### 1. Автоматическое создание профиля:
```sql
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
```

### 2. Обновление timestamps:
- `updated_at` автоматически обновляется при изменении записей

---

## 📈 Индексы для производительности

```sql
-- Корзина
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- Заказы  
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

---

## 🔧 Диагностика проблем

### Проблема: Корзина не сохраняется
**Возможные причины:**
1. Пользователь не авторизован → корзина в localStorage
2. Ошибки RLS → проверить политики
3. Сетевые ошибки → проверить логи Supabase

### Проблема: Заказы не создаются
**Возможные причины:**
1. Неправильная структура данных → проверить формат items
2. Ошибки валидации → проверить ограничения таблицы
3. Проблемы с RLS → временно отключить для тестирования

### Проблема: Уведомления не приходят
**Возможные причины:**
1. Edge Function не развернута → проверить Supabase Dashboard
2. Неправильные переменные окружения → проверить Telegram токены
3. Ошибки в коде уведомлений → проверить логи функций

---

## 📝 Рекомендации по оптимизации

1. **Очистка старых корзин**: Удалять cart_items старше 30 дней
2. **Архивация заказов**: Перемещать старые заказы в архивную таблицу
3. **Мониторинг**: Настроить алерты на ошибки RLS
4. **Бэкапы**: Регулярное резервное копирование критических данных

Эта архитектура обеспечивает надежную работу интернет-магазина с возможностью масштабирования и безопасным разделением данных между пользователями.