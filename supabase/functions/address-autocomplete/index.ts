import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const DADATA_KEY = Deno.env.get('DADATA_KEY')
    console.log('ENV:', { hasDadataKey: !!DADATA_KEY })
    if (!DADATA_KEY) {
      return new Response(JSON.stringify({ error: 'DADATA_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    let q = ''
    if (req.method === 'GET') {
      const url = new URL(req.url)
      q = url.searchParams.get('q') || ''
    } else {
      const body = await req.json().catch(() => ({}))
      q = body?.q || ''
    }
    console.log('Query:', { method: req.method, q })
    if (!q) return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    console.log('Calling DaData API...')
    const resp = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${DADATA_KEY}`
      },
      body: JSON.stringify({ query: q, count: 7 })
    })
    if (!resp.ok) {
      const text = await resp.text()
      console.error('DaData error:', { status: resp.status, text })
      return new Response(JSON.stringify({ error: 'DaData API error', status: resp.status, body: text }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const json = await resp.json()
    console.log('DaData response:', { suggestions: json.suggestions?.length || 0 })
    const out = (json.suggestions || []).map((s: any) => ({
      value: s.value,
      lat: s.data?.geo_lat || null,
      lon: s.data?.geo_lon || null
    }))

    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


