import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function deg2rad(deg: number) { return deg * (Math.PI / 180) }
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const lat = Number(body?.lat)
    const lon = Number(body?.lon)
    const WAREHOUSE_LAT = Number(Deno.env.get('WAREHOUSE_LAT'))
    const WAREHOUSE_LON = Number(Deno.env.get('WAREHOUSE_LON'))
    if (!isFinite(lat) || !isFinite(lon) || !isFinite(WAREHOUSE_LAT) || !isFinite(WAREHOUSE_LON)) {
      return new Response(JSON.stringify({ error: 'Invalid coords' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const YANDEX_API_KEY = Deno.env.get('YANDEX_API_KEY')
    let distance_km: number
    if (YANDEX_API_KEY) {
      // Можно внедрить запрос к Яндекс Matrix/Routes API. Пока fallback на haversine для минимальной реализации
      distance_km = haversine(WAREHOUSE_LAT, WAREHOUSE_LON, lat, lon)
    } else {
      distance_km = haversine(WAREHOUSE_LAT, WAREHOUSE_LON, lat, lon)
    }

    const cost_rub = Math.ceil(distance_km) * 7
    return new Response(JSON.stringify({ distance_km, cost_rub }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


