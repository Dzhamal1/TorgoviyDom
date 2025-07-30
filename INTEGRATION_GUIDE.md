# Руководство по интеграции системы пользователей и уведомлений

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install @supabase/supabase-js
```

### 2. Настройка переменных окружения
Создайте файл `.env` и добавьте:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Telegram (для уведомлений)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Настройка базы данных
Выполните SQL команды из файла `DATABASE_SETUP.md` в Supabase SQL Editor.

## 📋 Функциональность

### ✅ Система аутентификации
- **Регистрация** новых пользователей с email и паролем
- **Вход** в аккаунт с валидацией
- **Профили** пользователей с дополнительной информацией
- **Безопасность** через Row Level Security (RLS)

### ✅ Персональная корзина
- **Сохранение** корзины в базе данных
- **Синхронизация** между устройствами
- **Восстановление** при повторном входе
- **Защита** данных пользователя

### ✅ Система уведомлений
- **Telegram** уведомления администратору
- **Сохранение** всех сообщений и заказов
- **Статусы** обработки
- **Расширяемость** для email и SMS

## 🔧 Архитектура решения

### Технологический стек
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Уведомления**: Telegram Bot API
- **Безопасность**: Row Level Security + JWT

### Структура компонентов
```
src/
├── lib/
│   └── supabase.ts              # Конфигурация Supabase
├── contexts/
│   ├── AuthContext.tsx          # Контекст аутентификации
│   └── CartContext.tsx          # Контекст корзины
├── components/
│   └── Auth/
│       ├── AuthModal.tsx        # Модальное окно входа/регистрации
│       └── UserMenu.tsx         # Меню пользователя
├── services/
│   └── notificationService.ts   # Сервис уведомлений
└── supabase/
    └── functions/
        └── send-notification/   # Edge Function для уведомлений
```

## 🔐 Безопасность

### Row Level Security (RLS)
```sql
-- Пример политики безопасности
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

### Валидация данных
- **Frontend**: Проверка форм перед отправкой
- **Backend**: Ограничения на уровне базы данных
- **API**: Валидация в Edge Functions

### Защита от спама
- Ограничение частоты запросов
- Валидация email и телефонов
- Возможность добавления капчи

## 📊 База данных

### Схема таблиц
```sql
profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

cart_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP
)

contact_messages (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  preferred_contact TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP
)

orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP
)
```

## 🔔 Система уведомлений

### Типы уведомлений
1. **Обратная связь** - новые сообщения от клиентов
2. **Заказы** - новые заказы с деталями

### Формат уведомлений в Telegram
```
🔔 Новое сообщение с сайта

👤 Имя: Иван Петров
📞 Телефон: +7 (900) 123-45-67
📧 Email: ivan@example.com
💬 Сообщение: Интересует цемент М400
📱 Предпочтительная связь: WhatsApp
🕐 Время: 15.01.2024, 14:30
```

### Расширение уведомлений
Легко добавить поддержку:
- **Email** через SendGrid/Mailgun
- **SMS** через Twilio
- **Push-уведомления**
- **Slack/Discord**

## 🎯 Использование в коде

### Аутентификация
```tsx
import { useAuth } from '../contexts/AuthContext'

const MyComponent = () => {
  const { user, signIn, signUp, signOut } = useAuth()
  
  if (user) {
    return <div>Добро пожаловать, {user.email}!</div>
  }
  
  return <AuthModal />
}
```

### Корзина
```tsx
import { useCart } from '../contexts/CartContext'

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()
  
  const handleAddToCart = () => {
    addToCart(product)
  }
  
  return (
    <button onClick={handleAddToCart}>
      Добавить в корзину
    </button>
  )
}
```

### Уведомления
```tsx
import { saveContactMessage } from '../services/notificationService'

const ContactForm = () => {
  const handleSubmit = async (formData) => {
    const result = await saveContactMessage(formData)
    
    if (result.success) {
      alert('Сообщение отправлено!')
    }
  }
}
```

## 🚀 Развертывание

### 1. Настройка Supabase
1. Создайте проект на supabase.com
2. Выполните SQL миграции
3. Настройте переменные окружения
4. Разверните Edge Functions

### 2. Настройка Telegram
1. Создайте бота через @BotFather
2. Получите токен и chat_id
3. Добавьте переменные в Supabase

### 3. Тестирование
1. Зарегистрируйте тестового пользователя
2. Добавьте товары в корзину
3. Отправьте тестовое сообщение
4. Проверьте уведомления в Telegram

## 📈 Мониторинг

### Логи и аналитика
- **Supabase Dashboard** - логи базы данных
- **Edge Functions** - логи уведомлений
- **Auth** - статистика входов/регистраций

### Метрики
- Количество новых пользователей
- Конверсия корзины в заказы
- Время отклика уведомлений
- Ошибки аутентификации

## 🔧 Настройка и кастомизация

### Изменение дизайна
Все компоненты используют Tailwind CSS и легко кастомизируются:
```tsx
// Изменение цветов кнопок
className="bg-blue-600 hover:bg-blue-700" // Стандартный
className="bg-green-600 hover:bg-green-700" // Кастомный
```

### Добавление полей
Легко расширить профиль пользователя:
```sql
ALTER TABLE profiles ADD COLUMN company_name TEXT;
ALTER TABLE profiles ADD COLUMN address TEXT;
```

### Новые типы уведомлений
Добавьте в Edge Function:
```typescript
if (type === 'newsletter') {
  // Логика для рассылки
}
```

## ❓ FAQ

**Q: Как добавить email уведомления?**
A: Интегрируйте SendGrid в Edge Function и добавьте функцию `sendEmailNotification()`

**Q: Можно ли использовать без Telegram?**
A: Да, уберите вызов `sendTelegramMessage()` из Edge Function

**Q: Как добавить роли пользователей?**
A: Добавьте поле `role` в таблицу `profiles` и обновите RLS политики

**Q: Безопасно ли хранить корзину в базе?**
A: Да, используется RLS - пользователи видят только свои данные

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи в Supabase Dashboard
2. Убедитесь в правильности переменных окружения
3. Проверьте RLS политики
4. Тестируйте Edge Functions отдельно

Система готова к продакшену и легко масштабируется! 🎉