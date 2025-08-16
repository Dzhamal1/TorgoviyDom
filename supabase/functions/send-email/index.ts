import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()
    console.log('📧 Sending email:', { type })

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const TO_EMAIL = Deno.env.get('TO_EMAIL') || 'info@yourdomain.ru'
    
    console.log('ENV:', { 
      hasResendKey: !!RESEND_API_KEY,
      from: FROM_EMAIL,
      to: TO_EMAIL
    })

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let subject = ''
    let htmlContent = ''

    if (type === 'contact') {
      subject = `Новое сообщение от ${data.name}`
      htmlContent = `
        <h2>Новое сообщение с сайта</h2>
        <p><strong>Имя:</strong> ${data.name}</p>
        <p><strong>Телефон:</strong> ${data.phone}</p>
        ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ''}
        <p><strong>Сообщение:</strong></p>
        <p>${data.message}</p>
        <p><strong>Предпочитаемый способ связи:</strong> ${data.preferred_contact}</p>
      `
    } else if (type === 'order') {
      const items = data.items.map((item: any) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity} шт.</td>
          <td>${item.price} ₽</td>
          <td>${item.price * item.quantity} ₽</td>
        </tr>
      `).join('')

      subject = `Новый заказ #${data.orderId}`
      htmlContent = `
        <h2>Новый заказ #${data.orderId}</h2>
        <p><strong>Покупатель:</strong> ${data.customerName}</p>
        <p><strong>Телефон:</strong> ${data.customerPhone}</p>
        ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
        <p><strong>Адрес доставки:</strong> ${data.customerAddress}</p>
        ${data.delivery ? `<p><strong>Доставка:</strong> ${data.delivery.distance_km} км, ${data.delivery.cost_rub} ₽</p>` : ''}
        <h3>Товары:</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr>
            <th>Наименование</th>
            <th>Количество</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>
          ${items}
          <tr>
            <td colspan="3"><strong>Итого:</strong></td>
            <td><strong>${data.totalAmount} ₽</strong></td>
          </tr>
        </table>
      `
    }

    console.log('Calling Resend API...')
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: subject,
        html: htmlContent
      })
    })
    
    if (!resendResponse.ok) {
      const text = await resendResponse.text()
      console.error('Resend error:', { status: resendResponse.status, text })
      return new Response(JSON.stringify({ error: 'Failed to send email', status: resendResponse.status, body: text }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    const resendResult = await resendResponse.json()
    console.log('Resend success:', resendResult)

    return new Response(JSON.stringify({ success: true, resendId: resendResult.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Send email error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})