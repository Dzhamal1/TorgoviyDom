import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'
import LoadingSpinner from '../components/UI/LoadingSpinner'

const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<Array<{ id: string; name: string; address: string; contact?: string; lat?: number | null; lon?: number | null }> | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.partners()
        setPartners(data)
      } catch {
        setPartners([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const coords = useMemo(() => (partners || []).filter(p => typeof p.lat === 'number' && typeof p.lon === 'number') as Array<Required<Pick<any, 'lat' | 'lon'>>>, [partners])

  useEffect(() => {
    if (!mapRef.current || !partners || partners.length === 0) return
    // Подключаем Yandex JS API
    const scriptId = 'ymaps-script'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${import.meta.env.VITE_YANDEX_API_KEY}&lang=ru_RU`
      s.async = true
      document.body.appendChild(s)
      s.onload = () => initMap()
    } else {
      // @ts-ignore
      if (window.ymaps) initMap(); else (document.getElementById(scriptId) as any)?.addEventListener('load', initMap)
    }

    function initMap() {
      // @ts-ignore
      window.ymaps.ready(() => {
        // @ts-ignore
        const ymaps = window.ymaps
        const map = new ymaps.Map(mapRef.current!, {
          center: [55.751244, 37.618423],
          zoom: 5,
          controls: ['zoomControl']
        })
        const collection = new ymaps.GeoObjectCollection()
        const toGeocode: Array<{ name: string; address: string }> = []
        ;(partners || []).forEach(p => {
          if (typeof p.lat === 'number' && typeof p.lon === 'number') {
            const placemark = new ymaps.Placemark([p.lat, p.lon], {
              balloonContentHeader: p.name,
              balloonContentBody: p.address
            })
            collection.add(placemark)
          } else if (p.address) {
            toGeocode.push({ name: p.name, address: p.address })
          }
        })
        map.geoObjects.add(collection)
        const fit = () => {
          if (collection.getLength() > 0) {
            const bounds = collection.getBounds()
            if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30 })
          }
        }
        fit()
        // Клиентский фолбэк геокодирования для отсутствующих координат
        const apiKey = import.meta.env.VITE_YANDEX_API_KEY
        if (apiKey && toGeocode.length > 0) {
          const geocodeOne = async (addr: string) => {
            try {
              const resp = await fetch(`https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${apiKey}&geocode=${encodeURIComponent(addr)}`)
              if (!resp.ok) return null
              const g = await resp.json()
              const pos = g?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
              if (!pos) return null
              const [lonStr, latStr] = String(pos).split(' ')
              const lat = Number(latStr); const lon = Number(lonStr)
              if (!isFinite(lat) || !isFinite(lon)) return null
              return [lat, lon] as [number, number]
            } catch { return null }
          }
          ;(async () => {
            for (const t of toGeocode) {
              const coords = await geocodeOne(t.address)
              if (coords) {
                const pm = new ymaps.Placemark(coords, { balloonContentHeader: t.name, balloonContentBody: t.address })
                collection.add(pm)
              }
            }
            fit()
          })()
        }
        // Сохраняем на элемент
        // @ts-ignore
        mapRef.current!.__ymap = map
      })
    }
  }, [partners])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="Загружаем партнёров..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Наши партнёры</h1>
        {/* Карта */}
        {partners && partners.length > 0 && (
          <div className="w-full h-80 mb-6 rounded-lg overflow-hidden bg-white shadow">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}
        {(!partners || partners.length === 0) ? (
          <div className="bg-white p-6 rounded-lg shadow">Партнёры не найдены</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {partners.map((p) => (
              <article key={p.id} aria-label={`Партнёр ${p.name}`} className="bg-white p-6 rounded-lg shadow w-full">
                <h2 className="text-xl font-semibold text-gray-800">{p.name}</h2>
                <p className="text-gray-600 mt-2">{p.address}</p>
                {p.contact && (
                  <p className="text-gray-600 mt-1">{p.contact}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PartnersPage


