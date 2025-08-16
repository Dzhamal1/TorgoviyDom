import { supabase } from '../lib/supabase'

export interface ProductDto {
  id: string
  name: string
  sizes: string
  price: number
  image: string
  category: string
  class: string
  description: string
  manufacturer?: string
}

export const api = {
  async adminCheck(): Promise<boolean> {
    const session = (await supabase.auth.getSession()).data.session
    const { data, error } = await supabase.functions.invoke('admin-check', {
      method: 'GET' as any,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
    })
    if (error) return false
    return Boolean((data as any)?.ok)
  },

  async getProducts(params?: { category?: string; class?: string }): Promise<ProductDto[]> {
    const { data, error } = await supabase.functions.invoke('products', params ? { body: params } : {})
    if (error) throw error
    return (data as ProductDto[]) || []
  },

  async getFilters(params: { category?: string; class?: string }): Promise<{ manufacturers: string[]; classes: string[] }> {
    const { data, error } = await supabase.functions.invoke('filters', { body: params })
    if (error) throw error
    return (data as any) || { manufacturers: [], classes: [] }
  },

  async addressAutocomplete(q: string): Promise<Array<{ value: string; lat: number | null; lon: number | null }>> {
    try {
      const { data, error } = await supabase.functions.invoke('address-autocomplete', {
        body: { q }
      })
      if (error) throw error
      return (data as any) || []
    } catch (_) {
      // Fallback to GET with query param
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-autocomplete?q=${encodeURIComponent(q)}`
      const resp = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } })
      if (!resp.ok) return []
      return await resp.json()
    }
  },

  async deliveryCost(lat: number, lon: number): Promise<{ distance_km: number; cost_rub: number }> {
    const { data, error } = await supabase.functions.invoke('delivery-cost', {
      body: { lat, lon }
    })
    if (error) throw error
    return (data as any)
  },

  async partners(): Promise<Array<{ id: string; name: string; address: string; contact?: string; lat?: number | null; lon?: number | null }>> {
    const { data, error } = await supabase.functions.invoke('partners', { method: 'GET' as any })
    if (error) throw error
    return (data as any) || []
  }
}


