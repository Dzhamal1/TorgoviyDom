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

// Конфигурация EmailJS - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ
const EMAILJS_CONFIG = {
  serviceId: 'service_xxxxxxx',     // Замените на ваш Service ID
  templateId: 'template_xxxxxxx',   // Замените на ваш Template ID
  publicKey: 'xxxxxxxxxxxxxxx'     // Замените на ваш Public Key
}

// Функция для отправки email через EmailJS
const sendEmailNotification = async (type: 'contact' | 'order', data: any) => {
  try {
    console.log('📧 Отправка email уведомления через EmailJS:', type)
    
    // Проверяем настройки EmailJS
    if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId === 'service_xxxxxxx') {
      console.warn('⚠️ EmailJS не настроен. Настройте EMAILJS_CONFIG в notificationService.ts')
      return { success: false, error: 'EmailJS не настроен' }
    }

    // Динамически загружаем EmailJS
    const emailjs = await import('@emailjs/browser')
    
    // Формируем данные для отправки
    const templateParams = {
      to_email: 'info@td-stroika.ru',
      from_name: data.name || data.customerName,
      subject: type === 'order' ? `Новый заказ #${data.orderId}` : 'Новое сообщение с сайта',
      message: formatEmailMessage(type, data),
      customer_name: data.name || data.customerName,
      customer_phone: data.phone || data.customerPhone,
      customer_email: data.email || data.customerEmail || 'Не указан',
      order_total: type === 'order' ? `${data.totalAmount}₽` : '',
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // Отправляем email
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    )

    console.log('✅ Email отправлен успешно:', response.status)
    return { success: true, response }
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error)
    return { success: false, error: error.message }
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
  } catch (error) {
    console.error('❌ Критическая ошибка Telegram:', error)
    return { success: false, error }
  }
}

// Сохранение сообщения обратной связи
export const saveContactMessage = async (data: ContactNotification) => {
  try {
    console.log('💾 Обрабатываем сообщение от:', data.name)
    
    // 1. Сохраняем в базу данных
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
      console.error('❌ Ошибка сохранения сообщения в БД:', dbError)
      throw new Error(`Ошибка базы данных: ${dbError.message}`)
    }

    console.log('✅ Сообщение сохранено в БД:', savedMessage.id)

    const messageData = {
      ...data,
      id: savedMessage.id,
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
  } catch (error) {
    console.error('❌ Критическая ошибка обработки сообщения:', error)
    return { success: false, error: { message: error.message } }
  }
}

// Сохранение заказа
export const saveOrder = async (data: OrderNotification) => {
  try {
    console.log('🛒 Начинаем обработку заказа от:', data.customerName)
    console.log('📦 Данные заказа:', JSON.stringify(data, null, 2))
    
    // ИСПРАВЛЕНИЕ 4: Проверяем подключение к Supabase
    if (!supabase) {
      throw new Error('Supabase не инициализирован')
    }
    
    // 1. Сохраняем заказ в базу данных
    const orderToInsert = {
      customer_name: data.customerName.trim(),
      customer_phone: data.customerPhone.trim(),
      customer_email: data.customerEmail?.trim() || null,
      customer_address: data.customerAddress.trim(),
      items: data.items,
      total_amount: Number(data.totalAmount),
      status: 'new'
    }
    
    console.log('💾 Вставляем заказ в БД:', JSON.stringify(orderToInsert, null, 2))
    
    const { data: savedOrder, error: dbError } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select()
      .single()

    if (dbError) {
      console.error('❌ Детальная ошибка сохранения заказа в БД:')
      console.error('Код ошибки:', dbError.code)
      console.error('Сообщение:', dbError.message)
      console.error('Детали:', dbError.details)
      console.error('Подсказка:', dbError.hint)
      
      // Специфичные ошибки
      if (dbError.code === '42501') {
        throw new Error('Недостаточно прав для создания заказа. Проверьте RLS политики.')
      }
      if (dbError.code === '23505') {
        throw new Error('Заказ с такими данными уже существует.')
      }
      if (dbError.message.includes('relation "orders" does not exist')) {
        throw new Error('Таблица orders не существует. Выполните миграции базы данных.')
      }
      
      throw new Error(`Ошибка базы данных: ${dbError.message}`)
    }

    console.log('✅ Заказ успешно сохранен в БД с ID:', savedOrder.id)

    const orderData = {
      ...data,
      orderId: savedOrder.id,
      timestamp: new Date().toLocaleString('ru-RU')
    }

    // 2. Отправляем email уведомление (не блокирующее)
    console.log('📧 Отправляем email уведомление...')
    const emailResult = await sendEmailNotification('order', orderData)
    if (!emailResult.success) {
      console.warn('⚠️ Email уведомление не отправлено:', emailResult.error)
    }
    
    // 3. Отправляем в Telegram (не блокирующее)
    console.log('📱 Отправляем Telegram уведомление...')
    const telegramResult = await sendTelegramNotification({
      type: 'order',
      data: orderData
    })
    if (!telegramResult.success) {
      console.warn('⚠️ Telegram уведомление не отправлено:', telegramResult.error)
    }

    console.log('✅ Заказ полностью обработан')
    return { 
      success: true, 
      data: savedOrder,
      emailSent: emailResult.success,
      telegramSent: telegramResult.success
    }
  } catch (error) {
    console.error('❌ Критическая ошибка обработки заказа:', error)
    console.error('Stack trace:', error.stack)
    return { success: false, error: { message: error.message } }
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