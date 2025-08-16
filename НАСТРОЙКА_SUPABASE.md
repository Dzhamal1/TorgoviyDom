# Настройка Supabase для исправления ошибки 403

## 🔧 Исправление RLS политик

Выполните этот SQL код в Supabase SQL Editor для исправления ошибки "new row violates row-level security policy":

```sql
-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Все могут создавать сообщения" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;

-- Создаем новую политику для вставки сообщений
CREATE POLICY "contact_messages_insert_policy" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- Создаем политику для чтения (только админы)
CREATE POLICY "contact_messages_select_policy" ON public.contact_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND full_name ILIKE '%admin%'
    )
  );

-- Проверяем что RLS включен
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Аналогично для orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (auth.role() = 'authenticated' AND 
     EXISTS (
       SELECT 1 FROM public.profiles 
       WHERE id = auth.uid() AND full_name ILIKE '%admin%'
     ))
  );
```

## 🔔 Настройка Telegram уведомлений

1. Создайте бота в Telegram через @BotFather
2. Получите токен бота
3. Добавьте переменные окружения в Supabase Dashboard → Settings → Environment Variables:

```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_CHAT_ID=ваш_chat_id
```

4. Разверните Edge Function:
```bash
supabase functions deploy send-notification
```

## ✅ Проверка

После выполнения SQL кода:
1. Попробуйте отправить сообщение через форму контактов
2. Проверьте консоль браузера - ошибка 403 должна исчезнуть
3. Проверьте Telegram - должно прийти уведомление
