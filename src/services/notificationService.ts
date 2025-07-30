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

// Конфигурация для email уведомлений
const EMAIL_CONFIG = {
  // Используем EmailJS для отправки email без серверной части
  serviceId: 'service_construction_store',
  templateId: 'template_order_notification',
  publicKey: 'your_emailjs_public_key'
}

// Функция для отправки email через EmailJS
const sendEmailNotification = async (type: 'contact' | 'order', data: any) => {
  try {
    console.log('📧 Отправка email уведомления:', type)
    
    // Формируем данные для email
    const emailData = {
      to_email: 'info@td-stroika.ru', // Email администратора
      from_name: 'Торговый дом "Все для стройки"',
      subject: type === 'order' ? `Новый заказ #${data.orderId}` : 'Новое сообщение с сайта',
      message: formatEmailMessage(type, data)
    }

    // Отправляем через fetch к EmailJS API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'default_service',
        template_id: 'template_order',
        user_id: 'public_key',
        template_params: emailData
      })
    })

    if (response.ok) {
      console.log('✅ Email уведомление отправлено успешно')
      return { success: true }
    } else {
      console.warn('⚠️ Ошибка отправки email:', response.statusText)
      return { success: false, error: response.statusText }
    }
  } catch (error) {
    console.warn('⚠️ Исключение при отправке email:', error.message)
    return { success: false, error: error.message }
  }
}

// Форматирование сообщения для email
const formatEmailMessage = (type: 'contact' | 'order', data: any): string => {
  if (type === 'contact') {
    return `
Новое сообщение с сайта

Имя: ${data.name}
Телефон: ${data.phone}
Email: ${data.email || 'Не указан'}
Сообщение: ${data.message}
Предпочтительная связь: ${getContactMethod(data.preferredContact)}
Время: ${data.timestamp}
    `.trim()
  } else {
    const itemsList = data.items.map((item: any) => 
      `• ${item.name} - ${item.quantity} шт. × ${item.price}₽`
    ).join('\n')

    return `
Новый заказ #${data.orderId}

Покупатель: ${data.customerName}
Телефон: ${data.customerPhone}
Email: ${data.customerEmail || 'Не указан'}
Адрес: ${data.customerAddress}

Товары:
${itemsList}

Общая сумма: ${data.totalAmount}₽
Время заказа: ${data.timestamp}
    `.trim()
  }
}

// Функция для безопасного вызова Edge Function (теперь второстепенная)
const safeSendTelegramNotification = async (payload: any) => {
  try {
    console.log('📱 Попытка отправки в Telegram (второстепенно)...')
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    })

    if (error) {
      console.warn('⚠️ Telegram уведомление не отправлено:', error.message)
      return { success: false, error }
    }

    console.log('✅ Telegram уведомление отправлено')
    return { success: true, data }
  } catch (error) {
    console.warn('⚠️ Ошибка Telegram уведомления:', error.message)
    return { success: false, error }
  }
}

// Сохранение сообщения обратной связи
export const saveContactMessage = async (data: ContactNotification) => {
  try {
    console.log('💾 Сохраняем сообщение:', data.name)
    
    // 1. Сохраняем в базу данных
    const { data: savedMessage, error } = await supabase
      .from('contact_messages')
      .insert([
        {
          name: data.name,
          phone: data.phone,
          email: data.email,
          message: data.message,
          preferred_contact: data.preferredContact,
          status: 'new'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ Ошибка сохранения сообщения:', error)
      // Продолжаем работу даже если не удалось сохранить
    }

    const messageData = {
      ...data,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем email уведомление (ПРИОРИТЕТ)
    const emailResult = await sendEmailNotification('contact', messageData)
    
    // 3. Пытаемся отправить в Telegram (второстепенно)
    safeSendTelegramNotification({
      type: 'contact',
      data: messageData
    }).catch(err => {
      console.warn('⚠️ Telegram уведомление пропущено:', err.message)
    })

    console.log('✅ Сообщение обработано')
    return { 
      success: true, 
      data: savedMessage || { id: Date.now(), ...data },
      emailSent: emailResult.success
    }
  } catch (error) {
    console.error('❌ Критическая ошибка обработки сообщения:', error)
    return { success: false, error }
  }
}

// Сохранение заказа
export const saveOrder = async (data: OrderNotification) => {
  try {
    console.log('🛒 Обрабатываем заказ:', data.customerName)
    
    // 1. Сохраняем заказ в базу данных
    let savedOrder = null
    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert([
          {
            customer_name: data.customerName,
            customer_phone: data.customerPhone,
            customer_email: data.customerEmail,
            customer_address: data.customerAddress,
            items: data.items,
            total_amount: data.totalAmount,
            status: 'new'
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('❌ Ошибка сохранения заказа в БД:', error)
      } else {
        savedOrder = orderData
        console.log('✅ Заказ сохранен в БД:', savedOrder.id)
      }
    } catch (dbError) {
      console.error('❌ Критическая ошибка БД:', dbError)
    }

    const orderData = {
      ...data,
      orderId: savedOrder?.id || data.orderId || `ORDER-${Date.now()}`,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем email уведомление (ГЛАВНЫЙ ПРИОРИТЕТ)
    console.log('📧 Отправляем email уведомление о заказе...')
    const emailResult = await sendEmailNotification('order', orderData)
    
    if (emailResult.success) {
      console.log('✅ Email уведомление о заказе отправлено')
    } else {
      console.warn('⚠️ Email уведомление не отправлено:', emailResult.error)
    }

    // 3. Пытаемся отправить в Telegram (второстепенно, не блокируем процесс)
    safeSendTelegramNotification({
      type: 'order',
      data: orderData
    }).catch(err => {
      console.warn('⚠️ Telegram уведомление пропущено (не критично):', err.message)
    })

    console.log('✅ Заказ полностью обработан')
    return { 
      success: true, 
      data: savedOrder || orderData,
      emailSent: emailResult.success
    }
  } catch (error) {
    console.error('❌ Критическая ошибка обработки заказа:', error)
    
    // Даже при критической ошибке пытаемся отправить email
    try {
      await sendEmailNotification('order', {
        ...data,
        orderId: `EMERGENCY-${Date.now()}`,
        timestamp: new Date().toLocaleString('ru-RU')
      })
      console.log('✅ Экстренное email уведомление отправлено')
    } catch (emailError) {
      console.error('❌ Не удалось отправить экстренное email:', emailError)
    }
    
    return { success: false, error }
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
    const [contactMessages, orders] = await Promise.all([
      supabase
        .from('contact_messages')
        .select('status')
        .eq('status', 'new'),
      supabase
        .from('orders')
        .select('status')
        .eq('status', 'new')
    ])

    return {
      newMessages: contactMessages.data?.length || 0,
      newOrders: orders.data?.length || 0
    }
  } catch (error) {
    console.error('Error getting notification stats:', error)
    return { newMessages: 0, newOrders: 0 }
  }
}