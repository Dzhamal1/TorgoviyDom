import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    const spreadsheetId = Deno.env.get('SPREADSHEET_ID')
    const sheetName = 'Производители'
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Sheets env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:D1000?key=${apiKey}`
    const resp = await fetch(url)
    const json = await resp.json()
    const values: string[][] = json.values || []
    const out = values.map((row: string[], i: number) => ({
      id: `P${i + 1}`,
      name: row?.[0] || '',
      address: row?.[1] || '',
      contact: row?.[2] || undefined
    })).filter(p => p.name)
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to fetch partners' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


