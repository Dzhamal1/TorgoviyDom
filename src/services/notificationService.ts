import { supabase } from '../lib/supabase'

// Интерфейсы для уведомлений
interface ContactNotification {
  name: string
  phone: string
  email?: string
  message: string
  preferredContact: 'phone' | 'whatsapp' | 'telegram'
}

interface OrderNotification {
  orderId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  totalAmount: number
}

// EmailJS больше не используется; отправка через Edge Function/Resend

// Функция для отправки email через Resend (Edge Function)
const sendEmailNotification = async (type: 'contact' | 'order', data: any) => {
  try {
    console.log('📧 Отправка email уведомления через Resend:', type)
    
    // Добавляем timestamp к данным
    const emailData = {
      ...data,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // Вызываем Edge Function для отправки email
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        type,
        data: emailData
      }
    })

    if (error) {
      console.error('❌ Ошибка Edge Function send-email:', error)
      return { success: false, error: error.message }
    }

    if (result && result.success) {
      console.log('✅ Email отправлен успешно через Resend')
      return { success: true, resendId: result.resendId }
    } else {
      console.error('❌ Ошибка отправки email:', result?.error)
      return { success: false, error: result?.error || 'Неизвестная ошибка' }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Ошибка отправки email:', message)
    return { success: false, error: message }
  }
}

// Форматирование перенесено в Edge Function (send-email)

// Простая обертка таймаута
const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T | { timeout: true }> => {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve({ timeout: true } as const), ms)) as Promise<{ timeout: true }>
  ])
}

// Функция для отправки в Telegram через Edge Function
const sendTelegramNotification = async (payload: any) => {
  try {
    console.log('📱 Отправка Telegram уведомления...')
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    })

    if (error) {
      console.error('❌ Ошибка Telegram уведомления:', error)
      return { success: false, error }
    }

    console.log('✅ Telegram уведомление отправлено')
    return { success: true, data }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка Telegram:', message)
    return { success: false, error: message }
  }
}

// Сохранение сообщения обратной связи
export const saveContactMessage = async (data: ContactNotification) => {
  try {
    console.log('💾 Обрабатываем сообщение от:', data.name)
    
    // 1. Сохраняем в БД
    const { data: savedMessage, error: dbError } = await supabase
      .from('contact_messages')
      .insert([
        {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          message: data.message,
          preferred_contact: data.preferredContact,
          status: 'new'
        }
      ])
      .select()
      .single()

    let dbSaved = true
    if (dbError) {
      // Не прерываем процесс — продолжаем отправку уведомлений
      dbSaved = false
      console.error('❌ Ошибка сохранения сообщения в БД (продолжаем без БД):', dbError)
    } else {
      console.log('✅ Сообщение сохранено в БД:', savedMessage?.id)
    }

    const messageData = {
      ...data,
      id: savedMessage?.id,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем уведомления с ограничением по времени
    const emailResult = await withTimeout(sendEmailNotification('contact', messageData), 4000)
    const telegramResult = await withTimeout(
      sendTelegramNotification({ type: 'contact', data: messageData }),
      4000
    )

    console.log('✅ Сообщение полностью обработано')
    const emailSent = (emailResult as any)?.success === true
    const telegramSent = (telegramResult as any)?.success === true
    return {
      success: dbSaved || emailSent || telegramSent,
      data: savedMessage || null,
      dbSaved,
      emailSent,
      telegramSent,
      error: dbSaved ? undefined : { message: dbError?.message }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка обработки сообщения:', message)
    return { success: false, error: { message } }
  }
}

// Сохранение заказа
export const saveOrder = async (data: OrderNotification & { userId?: string }) => {
  try {
    console.log('🛒 Обрабатываем заказ от:', data.customerName)
    
    // 1. Сохраняем заказ в БД
    const { data: savedOrder, error: dbError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: data.userId ?? null,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_email: data.customerEmail || null,
          customer_address: data.customerAddress,
          items: data.items,
          total_amount: data.totalAmount,
          status: 'new'
        }
      ])
      .select()
      .single()

    if (dbError) {
      console.error('❌ Ошибка сохранения заказа в БД:', dbError)
      return { success: false, error: { message: dbError.message } }
    }
    console.log('✅ Заказ сохранен в БД:', savedOrder?.id)

    const orderData = {
      ...data,
      orderId: savedOrder?.id || data.orderId,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем уведомления с ограничением по времени
    const emailResult = await withTimeout(sendEmailNotification('order', orderData), 4000)
    const telegramResult = await withTimeout(
      sendTelegramNotification({ type: 'order', data: orderData }),
      4000
    )

    console.log('✅ Заказ полностью обработан')
    return { 
      success: true, 
      data: savedOrder || null,
      emailSent: (emailResult as any)?.success === true,
      telegramSent: (telegramResult as any)?.success === true
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка обработки заказа:', message)
    return { success: false, error: { message } }
  }
}

// Вспомогательная функция для форматирования способа связи
// getContactMethod использовалась только для форматирования email, сейчас не требуется

// Получение статистики для админки
export const getNotificationStats = async () => {
  try {
    const { data: contactMessages, error: contactError } = await supabase
      .from('contact_messages')
      .select('status')
      .eq('status', 'new');

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status')
      .eq('status', 'new');

    if (contactError) {
      console.error('Ошибка получения сообщений:', contactError.message);
    }
    if (ordersError) {
      console.error('Ошибка получения заказов:', ordersError.message);
    }

    return {
      newMessages: contactMessages?.length || 0,
      newOrders: orders?.length || 0,
      contactError,
      ordersError
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return { newMessages: 0, newOrders: 0, error };
  }
};