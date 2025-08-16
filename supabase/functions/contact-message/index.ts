import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Service env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({}))
    const payload = {
      name: String(body?.name || '').trim(),
      phone: String(body?.phone || '').trim(),
      email: body?.email ? String(body.email).trim() : null,
      message: String(body?.message || '').trim(),
      preferred_contact: String(body?.preferredContact || 'phone'),
      status: 'new'
    }

    if (!payload.name || !payload.phone) {
      return new Response(JSON.stringify({ error: 'name and phone are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = `${SUPABASE_URL}/rest/v1/contact_messages`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: 'DB insert failed', status: resp.status, body: text }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const data = await resp.json()
    return new Response(JSON.stringify({ success: true, data: Array.isArray(data) ? data[0] : data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


