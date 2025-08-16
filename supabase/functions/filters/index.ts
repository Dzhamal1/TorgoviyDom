import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Простой кэш в памяти (живёт в контейнере Edge Function) с TTL
type CacheEntry = { ts: number; payload: any }
const CACHE_KEY = '__FILTERS_CACHE__'
;(globalThis as any)[CACHE_KEY] ||= new Map<string, CacheEntry>()
const CACHE: Map<string, CacheEntry> = (globalThis as any)[CACHE_KEY]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Параметры: категория и класс (опционально)
    let category = ''
    let klass = ''
    if (req.method === 'GET') {
      const url = new URL(req.url)
      category = (url.searchParams.get('category') || '').toString()
      klass = (url.searchParams.get('class') || '').toString()
    } else if (req.method === 'POST') {
      try {
        const body = await req.json()
        category = (body?.category || '').toString()
        klass = (body?.class || '').toString()
      } catch {}
    }

    const cacheKey = JSON.stringify({ category, klass })
    const now = Date.now()
    const ttlMs = 5 * 60 * 1000
    const cached = CACHE.get(cacheKey)
    if (cached && now - cached.ts < ttlMs) {
      return new Response(JSON.stringify(cached.payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Читаем Google Sheets напрямую, чтобы избежать «двойного холодного старта»
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    const spreadsheetId = Deno.env.get('SPREADSHEET_ID')
    const sheetName = Deno.env.get('SHEET_NAME') || 'Материалы'
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Sheets env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Оптимизация: запрашиваем только нужные столбцы: E (category), F (class), H (manufacturer)
    const range = `${encodeURIComponent(sheetName)}!E2:H1000`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
    const resp = await fetch(url)
    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: 'Sheets fetch failed', status: resp.status, body: text }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const json = await resp.json()
    const values: string[][] = json.values || []

    // Индексы в нашем диапазоне E..H: E=0, F=1, G=2, H=3
    const normalize = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
    const normalizeKey = (s: unknown) => normalize(s).toLowerCase()
    const normCategory = normalizeKey(category)
    const normClass = normalizeKey(klass)
    const classesSet = new Set<string>()
    // Для производителей делаем нормализацию, но сохраняем оригинал для вывода
    const manufacturerNormalizedToOriginal = new Map<string, string>()

    for (let i = 0; i < values.length; i++) {
      const row = values[i] || []
      const rowCategory = normalize(row[0]) // E
      const rowClass = normalize(row[1]) // F
      const rowManufacturer = normalize(row[3]) // H

      // Фильтрация по категории
      if (normCategory && normalizeKey(rowCategory) !== normCategory) continue
      // Собираем классы (всегда из доступных строк текущей категории)
      if (rowClass) classesSet.add(rowClass)

      // Если выбран конкретный класс — собираем производителей только для него
      if (normClass) {
        if (normalizeKey(rowClass) !== normClass) continue
      }

      if (rowManufacturer) {
        const key = normalizeKey(rowManufacturer)
        if (!manufacturerNormalizedToOriginal.has(key)) {
          manufacturerNormalizedToOriginal.set(key, rowManufacturer)
        }
      }
    }

    const classes = Array.from(classesSet).sort((a, b) => a.localeCompare(b, 'ru'))
    // Уникальные производители (по нормализованному значению), но отдаём оригинальные строки
    const manufacturers = Array.from(manufacturerNormalizedToOriginal.values()).sort((a, b) => a.localeCompare(b, 'ru'))

    // Если по каким-то причинам ничего не нашли (например, неправильный лист или пустой диапазон),
    // сделаем фолбэк: вызовем products и соберём списки оттуда
    if (manufacturers.length === 0 && classes.length === 0) {
      try {
        const origin = new URL(req.url).origin
        const productsUrl = `${origin}/functions/v1/products`
        const incomingAuth = req.headers.get('authorization') || ''
        const incomingApiKey = req.headers.get('apikey') || ''
        const r = await fetch(productsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(incomingApiKey ? { 'apikey': incomingApiKey } : {}),
            ...(incomingAuth ? { 'Authorization': incomingAuth } : {})
          },
          body: JSON.stringify({ category, class: klass })
        })
        if (r.ok) {
          const products = await r.json()
          const clsSet = new Set<string>()
          const manNormToOrig = new Map<string, string>()
          for (const p of products as Array<any>) {
            const c = (p?.class || '').toString().trim()
            if (c) clsSet.add(c)
            const m = (p?.manufacturer || '').toString().trim()
            if (m) {
              const norm = m.replace(/\s+/g, ' ').trim().toLowerCase()
              if (!manNormToOrig.has(norm)) manNormToOrig.set(norm, m)
            }
          }
          const fbClasses = Array.from(clsSet).sort((a, b) => a.localeCompare(b, 'ru'))
          const fbManufacturers = Array.from(manNormToOrig.values()).sort((a, b) => a.localeCompare(b, 'ru'))
          if (fbClasses.length || fbManufacturers.length) {
            const payload = { manufacturers: fbManufacturers, classes: fbClasses }
            CACHE.set(cacheKey, { ts: now, payload })
            return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      } catch {}
    }

    const payload = { manufacturers, classes }
    CACHE.set(cacheKey, { ts: now, payload })
    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


