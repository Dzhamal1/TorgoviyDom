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

// Конфигурация EmailJS
const EMAILJS_CONFIG = {
  serviceId: 'service_torgoviydom',
  templateId: 'template_313kndr',
  publicKey: 'f48vPEQq_JdiFiVVk'
}

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

// Форматирование сообщения для email
const formatEmailMessage = (type: 'contact' | 'order', data: any): string => {
  if (type === 'contact') {
    return `
Новое сообщение с сайта "Торговый дом Все для стройки"

👤 Имя: ${data.name}
📞 Телефон: ${data.phone}
📧 Email: ${data.email || 'Не указан'}
💬 Сообщение: ${data.message}
📱 Предпочтительная связь: ${getContactMethod(data.preferredContact)}
🕐 Время: ${new Date().toLocaleString('ru-RU')}
    `.trim()
  } else {
    const itemsList = data.items.map((item: any) => 
      `• ${item.name} - ${item.quantity} шт. × ${item.price}₽ = ${item.quantity * item.price}₽`
    ).join('\n')

    return `
🛒 Новый заказ #${data.orderId}

👤 Покупатель: ${data.customerName}
📞 Телефон: ${data.customerPhone}
📧 Email: ${data.customerEmail || 'Не указан'}
📍 Адрес доставки: ${data.customerAddress}

📦 Товары:
${itemsList}

💰 Общая сумма: ${data.totalAmount}₽
🕐 Время заказа: ${new Date().toLocaleString('ru-RU')}

---
Заказ получен через сайт "Торговый дом Все для стройки"
    `.trim()
  }
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
    
    // 1. Пытаемся сохранить в БД (если RLS запрещает — логируем и продолжаем отправки)
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

    if (dbError) {
      console.warn('⚠️ RLS: Сообщение не сохранено в БД, продолжаем отправку уведомлений:', dbError.message)
    } else if (savedMessage) {
      console.log('✅ Сообщение сохранено в БД:', savedMessage.id)
    }

    const messageData = {
      ...data,
      id: savedMessage?.id,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем email уведомление
    const emailResult = await sendEmailNotification('contact', messageData)
    
    // 3. Отправляем в Telegram
    const telegramResult = await sendTelegramNotification({
      type: 'contact',
      data: messageData
    })

    console.log('✅ Сообщение полностью обработано')
    return { 
      success: true, 
      data: savedMessage,
      emailSent: emailResult.success,
      telegramSent: telegramResult.success
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
    
    // 1. Пытаемся сохранить заказ в БД (если RLS запрещает — логируем и продолжаем отправки)
    const { data: savedOrder, error: dbError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: data.userId || null,
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
      console.warn('⚠️ RLS: Заказ не сохранен в БД, продолжаем отправку уведомлений:', dbError.message)
    } else if (savedOrder) {
      console.log('✅ Заказ сохранен в БД:', savedOrder.id)
    }

    const orderData = {
      ...data,
      orderId: savedOrder?.id || data.orderId,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем email уведомление
    const emailResult = await sendEmailNotification('order', orderData)
    
    // 3. Отправляем в Telegram
    const telegramResult = await sendTelegramNotification({
      type: 'order',
      data: orderData
    })

    console.log('✅ Заказ полностью обработан')
    return { 
      success: true, 
      data: savedOrder,
      emailSent: emailResult.success,
      telegramSent: telegramResult.success
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка обработки заказа:', message)
    return { success: false, error: { message } }
  }
}

// Вспомогательная функция для форматирования способа связи
function getContactMethod(method: string): string {
  switch (method) {
    case 'phone': return '📞 Телефон'
    case 'whatsapp': return '💚 WhatsApp'
    case 'telegram': return '💙 Telegram'
    default: return method
  }
}

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