import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const DADATA_KEY = Deno.env.get('DADATA_KEY')
    if (!DADATA_KEY) {
      return new Response(JSON.stringify({ error: 'DADATA_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    if (!q) return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const resp = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${DADATA_KEY}`
      },
      body: JSON.stringify({ query: q, count: 7 })
    })
    const json = await resp.json()
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


