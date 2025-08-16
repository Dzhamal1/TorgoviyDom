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
    const sheetName = Deno.env.get('SHEET_COMPANIES_NAME') || 'Производители'
    const YANDEX_API_KEY = Deno.env.get('YANDEX_API_KEY')
    const SERVICE_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || Deno.env.get('SERVICE_ACCOUNT_JSON')
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Sheets env not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:F1000?key=${apiKey}`
    const resp = await fetch(url)
    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: 'Sheets fetch failed', status: resp.status, body: text, url }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const json = await resp.json()
    const values: string[][] = json.values || []

    // Helpers for service account write-back
    async function getAccessTokenFromServiceJson(serviceJson: string): Promise<string | null> {
      try {
        const svc = JSON.parse(serviceJson)
        const header = { alg: 'RS256', typ: 'JWT' }
        const now = Math.floor(Date.now() / 1000)
        const payload = {
          iss: svc.client_email,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600,
        }
        const enc = (obj: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        const data = `${enc(header)}.${enc(payload)}`
        // Import PKCS8 private key
        const pem = String(svc.private_key || '')
        const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '')
        const raw = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
        const key = await crypto.subtle.importKey(
          'pkcs8',
          raw,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const sigBuf = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(data))
        const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        const assertion = `${data}.${sigB64}`
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
        })
        if (!resp.ok) return null
        const tok = await resp.json()
        return tok.access_token || null
      } catch {
        return null
      }
    }

    async function writeLatLon(rowNumber: number, lat: number, lon: number, accessToken: string): Promise<void> {
      const range = `${sheetName}!E${rowNumber}:F${rowNumber}`
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[lat, lon]] })
        })
        if (!res.ok) {
          const text = await res.text()
          console.error('Sheets write failed', { status: res.status, text, range })
        } else {
          console.log('Sheets write ok', { range, lat, lon })
        }
      } catch (err) {
        console.error('Sheets write exception', { range, err: String(err) })
      }
    }

    const out: any[] = []
    const accessToken = SERVICE_JSON ? (await getAccessTokenFromServiceJson(SERVICE_JSON)) : null
    if (!accessToken) {
      console.warn('No access token for Google Sheets. Check GOOGLE_SERVICE_ACCOUNT_JSON and sharing permissions.')
    }
    for (let i = 0; i < values.length; i++) {
      const row = values[i] || []
      const id = row?.[0] || `P${i + 1}`
      const name = row?.[1] || ''
      const address = row?.[2] || ''
      const contact = row?.[3] || undefined
      let lat: number | null = row?.[4] ? Number(row[4]) : null
      let lon: number | null = row?.[5] ? Number(row[5]) : null
      if ((lat == null || isNaN(Number(lat))) || (lon == null || isNaN(Number(lon)))) {
        // 1) Пытаемся Яндексом, если есть ключ
        let ok = false
        if (YANDEX_API_KEY && address) {
          try {
            const geoResp = await fetch(`https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${YANDEX_API_KEY}&geocode=${encodeURIComponent(address)}`)
            if (geoResp.ok) {
              const g = await geoResp.json()
              const pos = g?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
              if (pos) {
                const [lonStr, latStr] = String(pos).split(' ')
                lat = Number(latStr); lon = Number(lonStr)
                ok = isFinite(Number(lat)) && isFinite(Number(lon))
              }
            } else {
              const t = await geoResp.text()
              console.warn('Yandex geocode failed', { status: geoResp.status, t, address })
            }
          } catch (e) {
            console.warn('Yandex geocode exception', String(e))
          }
        }

        // 2) Фолбэк: Nominatim (OpenStreetMap) без ключа, с политкорректным headers и rate limit
        if (!ok && address) {
          try {
            const osm = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
              headers: { 'User-Agent': 'supabase-edge-function/partners (contact: admin@example.com)' }
            })
            if (osm.ok) {
              const arr = await osm.json()
              const first = Array.isArray(arr) ? arr[0] : null
              if (first?.lat && first?.lon) {
                lat = Number(first.lat); lon = Number(first.lon)
                ok = isFinite(Number(lat)) && isFinite(Number(lon))
              }
            } else {
              const t = await osm.text()
              console.warn('OSM geocode failed', { status: osm.status, t, address })
            }
          } catch (e) {
            console.warn('OSM geocode exception', String(e))
          }
        }

        // Пишем обратно в таблицу, если геокод удался и есть доступ
        if (ok && accessToken) {
          const rowNumber = i + 2
          await writeLatLon(rowNumber, Number(lat), Number(lon), accessToken)
        }
      }
      out.push({ id, name, address, contact, lat: lat ?? null, lon: lon ?? null })
    }

    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to fetch partners' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


