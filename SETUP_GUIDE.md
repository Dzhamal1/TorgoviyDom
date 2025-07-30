# 🚀 Полное руководство по настройке уведомлений

## 📋 Содержание
1. [Настройка Supabase API](#1-настройка-supabase-api)
2. [Настройка EmailJS](#2-настройка-emailjs)
3. [Настройка Telegram Bot](#3-настройка-telegram-bot)
4. [Настройка Edge Functions](#4-настройка-edge-functions)
5. [Тестирование системы](#5-тестирование-системы)

---

## 1. Настройка Supabase API

### Шаг 1: Получение API ключей
1. Перейдите на [supabase.com](https://supabase.com)
2. Войдите в свой аккаунт или создайте новый
3. Создайте новый проект или выберите существующий
4. В левом меню выберите **Settings** → **API**
5. Скопируйте следующие данные:
   - **Project URL** (например: `https://ваш-проект.supabase.co`)
   - **anon public** ключ (длинная строка, начинающаяся с `eyJ...`)

### Шаг 2: Настройка .env файла
Создайте файл `.env` в корне проекта:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш-anon-ключ-здесь

# Telegram Bot Configuration (для Edge Function)
TELEGRAM_BOT_TOKEN=ваш-токен-бота
TELEGRAM_CHAT_ID=ваш-chat-id
```

### Шаг 3: Настройка аутентификации в Supabase
1. В Supabase Dashboard перейдите в **Authentication** → **Settings**
2. **ВАЖНО**: Отключите "Confirm email" если не настроили SMTP
3. В **URL Configuration** добавьте:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`

---

## 2. Настройка EmailJS

### Шаг 1: Создание аккаунта EmailJS
1. Перейдите на [emailjs.com](https://www.emailjs.com/)
2. Создайте бесплатный аккаунт
3. Подтвердите email

### Шаг 2: Настройка Email Service
1. В панели EmailJS перейдите в **Email Services**
2. Нажмите **Add New Service**
3. Выберите ваш email провайдер (Gmail, Outlook, Yahoo и т.д.)
4. Следуйте инструкциям для подключения
5. Скопируйте **Service ID** (например: `service_abc123`)

### Шаг 3: Создание Email Template
1. Перейдите в **Email Templates**
2. Нажмите **Create New Template**
3. Создайте шаблон со следующими переменными:
   ```
   Тема: {{subject}}
   
   От: {{customer_name}}
   Телефон: {{customer_phone}}
   Email: {{customer_email}}
   
   Сообщение:
   {{message}}
   
   Время: {{timestamp}}
   ```
4. Скопируйте **Template ID** (например: `template_xyz789`)

### Шаг 4: Получение Public Key
1. Перейдите в **Account** → **General**
2. Скопируйте **Public Key** (например: `user_abc123xyz`)

### Шаг 5: Настройка в коде
Откройте файл `src/services/notificationService.ts` и замените:
```typescript
const EMAILJS_CONFIG = {
  serviceId: 'ваш-service-id',      // Замените на ваш Service ID
  templateId: 'ваш-template-id',    // Замените на ваш Template ID
  publicKey: 'ваш-public-key'       // Замените на ваш Public Key
}
```

---

## 3. Настройка Telegram Bot

### Шаг 1: Создание бота
1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "Торговый дом Уведомления")
   - Введите username бота (например: "td_stroika_bot")
4. Скопируйте **токен бота** (например: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Шаг 2: Получение Chat ID
**Вариант 1 - Личные сообщения:**
1. Напишите боту любое сообщение
2. Перейдите по ссылке: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
3. Найдите `"chat":{"id":123456789}` - это ваш Chat ID

**Вариант 2 - Групповой чат:**
1. Добавьте бота в группу
2. Сделайте бота администратором
3. Отправьте сообщение в группу
4. Перейдите по ссылке выше и найдите Chat ID (будет отрицательным)

### Шаг 3: Тестирование бота
Проверьте работу бота:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/sendMessage?chat_id=<ВАШ_CHAT_ID>&text=Тест
```

---

## 4. Настройка Edge Functions

### Шаг 1: Настройка переменных в Supabase
1. В Supabase Dashboard перейдите в **Edge Functions**
2. Нажмите **Settings** или **Environment Variables**
3. Добавьте переменные:
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота
   - `TELEGRAM_CHAT_ID` = ваш chat ID

### Шаг 2: Проверка деплоя функции
Edge Function автоматически развертывается. Проверьте в **Edge Functions** что функция `send-notification` активна.

---

## 5. Тестирование системы

### Шаг 1: Перезапуск приложения
```bash
npm run dev
```

### Шаг 2: Тест формы обратной связи
1. Откройте сайт
2. Заполните форму "Свяжитесь с нами"
3. Отправьте сообщение
4. Проверьте:
   - Консоль браузера на ошибки
   - Email на указанный адрес
   - Telegram на уведомление

### Шаг 3: Тест оформления заказа
1. Добавьте товары в корзину
2. Перейдите в корзину
3. Заполните данные заказа
4. Оформите заказ
5. Проверьте уведомления

### Шаг 4: Проверка базы данных
В Supabase Dashboard → **Table Editor** проверьте таблицы:
- `contact_messages` - должны появиться новые записи
- `orders` - должны появиться новые заказы

---

## 🔧 Решение проблем

### Проблема: "No API key found"
**Решение:** Проверьте файл `.env` и перезапустите сервер

### Проблема: EmailJS не работает
**Решение:** 
1. Проверьте правильность Service ID, Template ID, Public Key
2. Убедитесь что email сервис подключен в EmailJS
3. Проверьте лимиты бесплатного аккаунта (200 писем/месяц)

### Проблема: Telegram не получает сообщения
**Решение:**
1. Проверьте токен бота и Chat ID
2. Убедитесь что бот не заблокирован
3. Проверьте переменные окружения в Supabase Edge Functions

### Проблема: Заказы не сохраняются
**Решение:**
1. Выполните SQL миграции из `DATABASE_SETUP.md`
2. Проверьте RLS политики в Supabase
3. Проверьте консоль браузера на ошибки

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте консоль браузера (F12)
2. Проверьте логи в Supabase Dashboard → **Logs**
3. Проверьте настройки аутентификации в Supabase
4. Убедитесь что все переменные окружения настроены правильно

**Важно:** После изменения файла `.env` всегда перезапускайте сервер разработки!