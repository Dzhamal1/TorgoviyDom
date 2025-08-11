    import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiUrl = new URL(req.url)
    const category = apiUrl.searchParams.get('category') || ''
    const klass = apiUrl.searchParams.get('class') || ''
    const base = new URL(req.url)
    base.pathname = '/'

    // Внутренний вызов нашей же products функции
    const productsUrl = new URL(req.url)
    productsUrl.pathname = '/products'
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (klass) params.set('class', klass)
    productsUrl.search = params.toString()

    const resp = await fetch(productsUrl.toString())
    const products = await resp.json()

    const manufacturersSet = new Set<string>()
    const classesSet = new Set<string>()
    for (const p of products) {
      if (p.manufacturer) manufacturersSet.add(p.manufacturer)
      if (p.class) classesSet.add(p.class)
    }

    return new Response(JSON.stringify({
      manufacturers: Array.from(manufacturersSet).sort(),
      classes: Array.from(classesSet).sort()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


