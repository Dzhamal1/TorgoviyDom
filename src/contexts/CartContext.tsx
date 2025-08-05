
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

// Хук для использования корзины
export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

// Провайдер корзины
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  // Загрузка корзины при инициализации
  useEffect(() => {
    loadCart()
  }, [user])

  // Загрузка корзины из Supabase или localStorage
  const loadCart = async () => {
    setIsLoading(true)
    try {
      if (user) {
        console.log('🔄 Загружаем корзину из Supabase для пользователя:', user.email)
        await loadCartFromSupabase()
      } else {
        console.log('🔄 Загружаем корзину из localStorage (гость)')
        loadCartFromLocalStorage()
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки корзины:', error)
      loadCartFromLocalStorage() // Fallback к localStorage
    } finally {
      setIsLoading(false)
    }
  }

  // Загрузка корзины из Supabase
  const loadCartFromSupabase = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Ошибка загрузки корзины из Supabase:', error)
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
        console.log('✅ Корзина загружена из Supabase:', cartItems.length, 'товаров')
        
        // Синхронизируем с localStorage
        localStorage.setItem('cart', JSON.stringify(cartItems))
      }
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки из Supabase:', error)
    }
  }

  // Загрузка корзины из localStorage
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
        console.log('✅ Корзина загружена из localStorage:', cartWithDates.length, 'товаров')
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки корзины из localStorage:', error)
      localStorage.removeItem('cart')
    }
  }

  // Сохранение корзины
  const saveCart = async (newItems: CartItem[]) => {
    // Всегда сохраняем в localStorage
    try {
      localStorage.setItem('cart', JSON.stringify(newItems))
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error)
    }

    // Если пользователь авторизован, сохраняем в Supabase
    if (user) {
      try {
        await saveCartToSupabase(newItems)
      } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error)
      }
    }
  }

  // Сохранение корзины в Supabase
  const saveCartToSupabase = async (cartItems: CartItem[]) => {
    if (!user) return

    try {
      // Удаляем старые записи
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('❌ Ошибка удаления старых записей:', deleteError)
        return
      }

      // Добавляем новые записи
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

        const { error } = await supabase
          .from('cart_items')
          .insert(supabaseItems)

        if (error) {
          console.error('❌ Ошибка сохранения в Supabase:', error)
        } else {
          console.log('✅ Корзина сохранена в Supabase:', cartItems.length, 'товаров')
        }
      }
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения в Supabase:', error)
    }
  }

  // Добавление товара в корзину
  const addItem = async (product: Product, quantity = 1): Promise<void> => {
    setIsLoading(true)
    
    try {
      const newItems = [...items]
      const existingItemIndex = newItems.findIndex(item => item.product.id === product.id)
      
      if (existingItemIndex >= 0) {
        // Увеличиваем количество существующего товара
        newItems[existingItemIndex].quantity += quantity
      } else {
        // Добавляем новый товар
        const newItem: CartItem = {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity,
          addedAt: new Date()
        }
        newItems.push(newItem)
      }
      
      setItems(newItems)
      await saveCart(newItems)
      
      console.log('✅ Товар добавлен в корзину:', product.name, 'x', quantity)
    } catch (error) {
      console.error('❌ Ошибка добавления товара в корзину:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Удаление товара из корзины
  const removeItem = async (productId: string): Promise<void> => {
    const newItems = items.filter(item => item.product.id !== productId)
    setItems(newItems)
    await saveCart(newItems)
    console.log('🗑️ Товар удален из корзины:', productId)
  }

  // Обновление количества товара
  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    if (quantity <= 0) {
      await removeItem(productId)
      return
    }

    const newItems = items.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    )
    
    setItems(newItems)
    await saveCart(newItems)
    console.log('🔄 Количество товара обновлено:', productId, 'на', quantity)
  }

  // Очистка корзины
  const clearCart = async (): Promise<void> => {
    setItems([])
    await saveCart([])
    console.log('🧹 Корзина очищена')
  }

  // Получение количества конкретного товара в корзине
  const getItemQuantity = (productId: string): number => {
    const item = items.find(item => item.product.id === productId)
    return item ? item.quantity : 0
  }

  // Синхронизация корзины
  const syncCart = async (): Promise<void> => {
    await loadCart()
  }

  // Вычисление общего количества товаров
  const totalItems = items.reduce((total, item) => total + item.quantity, 0)

  // Вычисление общей стоимости
  const totalPrice = items.reduce((total, item) => total + (item.product.price * item.quantity), 0)

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

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
