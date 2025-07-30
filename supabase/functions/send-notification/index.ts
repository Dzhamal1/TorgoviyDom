import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface NotificationData {
  type: 'contact' | 'order'
  data: any
}

serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Получен запрос на отправку уведомления')
    
    const { type, data }: NotificationData = await req.json()
    
    // Получаем переменные окружения
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Telegram переменные не настроены')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram переменные не настроены в Supabase Edge Functions' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Формируем сообщение для Telegram
    let message = ''
    
    if (type === 'contact') {
      message = `
🔔 *Новое сообщение с сайта*

👤 *Имя:* ${data.name}
📞 *Телефон:* ${data.phone}
📧 *Email:* ${data.email || 'Не указан'}
💬 *Сообщение:* ${data.message}
📱 *Предпочтительная связь:* ${getContactMethod(data.preferredContact)}
🕐 *Время:* ${data.timestamp}
      `.trim()
    } else if (type === 'order') {
      const itemsList = data.items.map((item: any) => 
        `• ${item.name} - ${item.quantity} шт. × ${item.price}₽`
      ).join('\n')

      message = `
🛒 *Новый заказ #${data.orderId}*

👤 *Покупатель:* ${data.customerName}
📞 *Телефон:* ${data.customerPhone}
📧 *Email:* ${data.customerEmail || 'Не указан'}
📍 *Адрес:* ${data.customerAddress}

📦 *Товары:*
${itemsList}

💰 *Общая сумма:* ${data.totalAmount}₽
🕐 *Время заказа:* ${data.timestamp}
      `.trim()
    }

    // Отправляем сообщение в Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    const telegramResult = await telegramResponse.json()

    if (!telegramResponse.ok) {
      console.error('❌ Ошибка отправки в Telegram:', telegramResult)
      throw new Error(`Telegram API error: ${telegramResult.description}`)
    }

    console.log('✅ Уведомление отправлено в Telegram')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Уведомление отправлено',
        telegram: telegramResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Ошибка в Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getContactMethod(method: string): string {
  switch (method) {
    case 'phone': return '📞 Телефон'
    case 'whatsapp': return '💚 WhatsApp'
    case 'telegram': return '💙 Telegram'
    default: return method
  }
}