import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Product } from '../types'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

// Интерфейс товара в корзине
export interface CartItem {
  id: string
  product: Product
  quantity: number
  addedAt: Date
}

// Интерфейс контекста корзины
interface CartContextType {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  isLoading: boolean
  addItem: (product: Product, quantity?: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getItemQuantity: (productId: string) => number
  syncCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    loadCart()
  }, [user])

  const loadCart = async () => {
    setIsLoading(true)
    try {
      if (user) {
        await loadCartFromSupabase()
      } else {
        loadCartFromLocalStorage()
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки корзины:', error)
      loadCartFromLocalStorage()
    } finally {
      setIsLoading(false)
    }
  }

  const loadCartFromSupabase = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
      if (error) {
        console.error('❌ Ошибка загрузки корзины из Supabase:', error)
        loadCartFromLocalStorage()
        return
      }
      if (data && data.length > 0) {
        const cartItems: CartItem[] = data.map(item => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.product_price,
            image: item.product_image,
            category: item.product_category,
            description: `${item.product_name} - ${item.product_category}`,
            inStock: true
          },
          quantity: item.quantity,
          addedAt: new Date(item.created_at)
        }))
        setItems(cartItems)
        localStorage.setItem('cart', JSON.stringify(cartItems))
      } else {
        loadCartFromLocalStorage()
      }
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки из Supabase:', error)
      loadCartFromLocalStorage()
    }
  }

  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        const cartWithDates = parsedCart.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }))
        setItems(cartWithDates)
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки корзины из localStorage:', error)
      localStorage.removeItem('cart')
    }
  }

  const saveCart = async (newItems: CartItem[]) => {
    try {
      localStorage.setItem('cart', JSON.stringify(newItems))
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error)
    }
    if (user) {
      try {
        await saveCartToSupabase(newItems)
      } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error)
      }
    }
  }

  const saveCartToSupabase = async (cartItems: CartItem[]) => {
    if (!user) return
    try {
      await supabase.from('cart_items').delete().eq('user_id', user.id)
      if (cartItems.length > 0) {
        const supabaseItems = cartItems.map(item => ({
          user_id: user.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          product_image: item.product.image,
          product_category: item.product.category,
          quantity: item.quantity
        }))
        const { error } = await supabase.from('cart_items').insert(supabaseItems)
        if (error) {
          console.error('❌ Ошибка сохранения в Supabase:', error)
        }
      }
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения в Supabase:', error)
    }
  }

  const addItem = async (product: Product, quantity = 1): Promise<void> => {
    setIsLoading(true)
    try {
      const newItems = [...items]
      const existingIndex = newItems.findIndex(i => i.product.id === product.id)
    if (existingIndex >= 0) {
      const current = newItems[existingIndex] as CartItem
      newItems[existingIndex] = {
        id: current.id,
        product: current.product,
        addedAt: current.addedAt,
        quantity: current.quantity + quantity
      }
    } else {
        newItems.push({ id: `${product.id}-${Date.now()}`, product, quantity, addedAt: new Date() })
      }
      setItems(newItems)
      await saveCart(newItems)
    } catch (error) {
      console.error('❌ Ошибка добавления товара в корзину:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = async (productId: string): Promise<void> => {
    const newItems = items.filter(i => i.product.id !== productId)
    setItems(newItems)
    await saveCart(newItems)
  }

  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    if (quantity <= 0) {
      await removeItem(productId)
      return
    }
    const newItems = items.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    setItems(newItems)
    await saveCart(newItems)
  }

  const clearCart = async (): Promise<void> => {
    setItems([])
    await saveCart([])
  }

  const getItemQuantity = (productId: string): number => {
    const item = items.find(i => i.product.id === productId)
    return item ? item.quantity : 0
  }

  const syncCart = async (): Promise<void> => {
    await loadCart()
  }

  const totalItems = items.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = items.reduce((total, item) => total + item.product.price * item.quantity, 0)

  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    syncCart
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}