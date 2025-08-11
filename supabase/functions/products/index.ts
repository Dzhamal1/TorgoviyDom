import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    const spreadsheetId = Deno.env.get('SPREADSHEET_ID')
    const sheetName = 'Материалы'
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Sheets env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:H1000?key=${apiKey}`
    const resp = await fetch(url)
    const json = await resp.json()
    const values: string[][] = json.values || []

    // Параметры фильтрации
    const urlObj = new URL(req.url)
    const categoryFilter = urlObj.searchParams.get('category')?.trim()
    const classFilter = urlObj.searchParams.get('class')?.trim()

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
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


