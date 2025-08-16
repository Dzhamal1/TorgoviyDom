import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    const spreadsheetId = Deno.env.get('SPREADSHEET_ID')
    const sheetName = Deno.env.get('SHEET_NAME') || 'Материалы'
    console.log('ENV:', { apiKey: !!apiKey, spreadsheetId, sheetName })
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Sheets env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:H1000?key=${apiKey}`
    console.log('Fetching:', url)
    const resp = await fetch(url)
    if (!resp.ok) {
      const text = await resp.text()
      console.error('Sheets error:', { status: resp.status, text })
      return new Response(JSON.stringify({ error: 'Sheets fetch failed', status: resp.status, body: text, url }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const json = await resp.json()
    console.log('Got response:', { rows: json.values?.length || 0 })
    const values: string[][] = json.values || []

    // Параметры фильтрации: поддерживаем и GET ?query, и POST body
    let categoryFilter: string | undefined
    let classFilter: string | undefined
    if (req.method === 'GET') {
      const urlObj = new URL(req.url)
      categoryFilter = urlObj.searchParams.get('category')?.trim() || undefined
      classFilter = urlObj.searchParams.get('class')?.trim() || undefined
    } else if (req.method === 'POST') {
      try {
        const body = await req.json()
        categoryFilter = body?.category?.trim() || undefined
        classFilter = body?.class?.trim() || undefined
      } catch (_) {}
    }

    const products = values.map((row: string[], idx: number) => {
      const name = row?.[0] || ''
      const sizesRaw = row?.[1] || ''
      const priceStr = row?.[2] || '0'
      const image = row?.[3] || ''
      const category = row?.[4] || ''
      const klass = row?.[5] || ''
      const description = row?.[6] || ''
      const manufacturer = row?.[7] || ''
      const price = Number(priceStr.toString().replace(/\s/g, '').replace(',', '.')) || 0
      return {
        id: `row-${idx + 2}`,
        name,
        sizes: sizesRaw || 'Размеры не указаны',
        price,
        image,
        category,
        class: klass,
        description,
        manufacturer: manufacturer || undefined
      }
    }).filter(p => p.name)
    .filter(p => !categoryFilter || p.category === categoryFilter)
    .filter(p => !classFilter || p.class === classFilter)

    return new Response(JSON.stringify(products), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Products error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


