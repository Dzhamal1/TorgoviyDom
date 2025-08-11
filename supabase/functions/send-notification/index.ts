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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data }: NotificationData = await req.json()

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return new Response(JSON.stringify({ success: false, error: 'Telegram env not set' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let message = ''
    if (type === 'contact') {
      message = `🔔 Новое сообщение\n\nИмя: ${data.name}\nТелефон: ${data.phone}\nEmail: ${data.email || 'Не указан'}\nСообщение: ${data.message}\nСвязь: ${data.preferredContact}\nВремя: ${data.timestamp}`
    } else if (type === 'order') {
      const itemsList = data.items.map((i: any) => `• ${i.name} × ${i.quantity} = ${i.price * i.quantity}₽`).join('\n')
      message = `🛒 Новый заказ #${data.orderId}\n\nПокупатель: ${data.customerName}\nТелефон: ${data.customerPhone}\nEmail: ${data.customerEmail || 'Не указан'}\nАдрес: ${data.customerAddress}\n\nТовары:\n${itemsList}\n\nИтого: ${data.totalAmount}₽\nВремя: ${data.timestamp}`
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    let attempt = 0
    let lastError: any = null
    while (attempt < 3) {
      attempt++
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
      })
      const json = await resp.json()
      if (resp.ok) {
        return new Response(JSON.stringify({ success: true, telegram: json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      lastError = json
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)))
    }
    return new Response(JSON.stringify({ success: false, error: lastError }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


