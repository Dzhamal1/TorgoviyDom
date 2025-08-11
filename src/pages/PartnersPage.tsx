import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import LoadingSpinner from '../components/UI/LoadingSpinner'

const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<Array<{ id: string; name: string; address: string; contact?: string }> | null>(null)
  const [loading, setLoading] = useState(true)

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


