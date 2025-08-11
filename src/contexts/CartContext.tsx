import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { CartItem } from '../lib/mysql'
import { CartService } from '../services/cartService'
import { useAuth } from './AuthContext'

// Интерфейс контекста корзины
interface CartContextType {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  isLoading: boolean
  addToCart: (product: any) => Promise<boolean>
  removeFromCart: (itemId: number) => Promise<boolean>
  updateQuantity: (itemId: number, quantity: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
  refreshCart: () => Promise<void>
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
  const { user, isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Загрузка корзины при инициализации или изменении состояния аутентификации
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshCart()
    } else {
      // Если пользователь не аутентифицирован, очищаем корзину
      setItems([])
    }
  }, [isAuthenticated, user])

  // Функция обновления корзины (загрузка данных из сервиса)
  const refreshCart = async () => {
    // Убедимся, что пользователь существует и аутентифицирован
    if (!user) return

    try {
      setIsLoading(true)
      // Загружаем корзину пользователя с помощью нового сервиса
      const cartItems = await CartService.getUserCart(user.id)
      setItems(cartItems)
      console.log('✅ Корзина загружена:', cartItems.length, 'товаров')
    } catch (error) {
      console.error('❌ Ошибка загрузки корзины:', error)
      // Fallback к localStorage при любой ошибке
      loadCartFromLocalStorage()
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
        // Fallback к localStorage при ошибке
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
        console.log('✅ Корзина загружена из Supabase:', cartItems.length, 'товаров')
        
        // Синхронизируем с localStorage
        localStorage.setItem('cart', JSON.stringify(cartItems))
      } else {
        // Если в Supabase нет данных, пробуем загрузить из localStorage и синхронизировать в БД
        try {
          const savedCart = localStorage.getItem('cart')
          if (savedCart) {
            const parsedCart = JSON.parse(savedCart)
            const cartWithDates = parsedCart.map((item: any) => ({
              ...item,
              addedAt: new Date(item.addedAt)
            }))
            setItems(cartWithDates)
            console.log('✅ Локальная корзина найдена. Синхронизируем в Supabase...')
            await saveCartToSupabase(cartWithDates)
          } else {
            setItems([])
          }
        } catch (e) {
          console.error('❌ Ошибка синхронизации локальной корзины:', e)
          loadCartFromLocalStorage()
        }
      }
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки из Supabase:', error)
      // Fallback к localStorage при любой ошибке
      loadCartFromLocalStorage()
    }
  }

  // Удаление товара из корзины
  const removeFromCart = async (itemId: number): Promise<boolean> => {
    try {
      // Используем новый сервис для удаления товара
      await CartService.removeFromCart(itemId)
      // Обновляем состояние корзины
      await refreshCart()
      console.log('✅ Товар удален из корзины:', itemId)
      return true
    } catch (error) {
      console.error('❌ Ошибка удаления товара из корзины:', error)
      return false
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
        // Не прерываем работу при ошибке Supabase
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
        // Продолжаем работу, даже если удаление не удалось
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
          // Не прерываем работу при ошибке сохранения
        } else {
          console.log('✅ Корзина сохранена в Supabase:', cartItems.length, 'товаров')
        }
      }
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения в Supabase:', error)
      // Не прерываем работу при критических ошибках
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
        const existingItem = newItems[existingItemIndex]
        if (existingItem) {
          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + quantity
          }
        }
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
      
      // Сохраняем корзину (может не удаться, но не прерываем работу)
      try {
        await saveCart(newItems)
        console.log('✅ Товар добавлен в корзину:', product.name, 'x', quantity)
      } catch (saveError) {
        console.error('❌ Ошибка сохранения корзины:', saveError)
        // Не прерываем работу при ошибке сохранения
        console.log('✅ Товар добавлен в корзину (локально):', product.name, 'x', quantity)
      }
    } catch (error) {
      console.error('❌ Ошибка добавления товара в корзину:', error)
      // Не выбрасываем ошибку, чтобы не блокировать интерфейс
    } finally {
      setIsLoading(false)
    }
  }

  // Вычисление общего количества товаров в корзине
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  // Вычисление общей стоимости товаров в корзине
  const totalPrice = items.reduce((sum, item) => sum + (item.product_price * item.quantity), 0)

  // Значение, передаваемое в контекст
  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}