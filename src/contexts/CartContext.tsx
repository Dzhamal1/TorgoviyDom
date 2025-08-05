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
      // В случае ошибки, очищаем локальное состояние корзины
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  // Добавление товара в корзину
  const addToCart = async (product: any): Promise<boolean> => {
    // Проверяем, авторизован ли пользователь
    if (!user) {
      console.error('❌ Пользователь не авторизован для добавления в корзину')
      return false
    }

    try {
      // Используем новый сервис для добавления товара
      await CartService.addToCart(user.id, product)
      // Обновляем состояние корзины после успешного добавления
      await refreshCart()
      console.log('✅ Товар добавлен в корзину:', product.name)
      return true
    } catch (error) {
      console.error('❌ Ошибка добавления товара в корзину:', error)
      return false
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

  // Обновление количества товара в корзине
  const updateQuantity = async (itemId: number, quantity: number): Promise<boolean> => {
    // Если количество стало 0 или меньше, удаляем товар
    if (quantity <= 0) {
      return await removeFromCart(itemId)
    }

    try {
      // Используем новый сервис для обновления количества
      await CartService.updateQuantity(itemId, quantity)
      // Обновляем состояние корзины
      await refreshCart()
      console.log('✅ Количество товара обновлено:', itemId, 'на', quantity)
      return true
    } catch (error) {
      console.error('❌ Ошибка обновления количества товара:', error)
      return false
    }
  }

  // Очистка всей корзины
  const clearCart = async (): Promise<boolean> => {
    // Проверяем, авторизован ли пользователь
    if (!user) {
      console.error('❌ Пользователь не авторизован для очистки корзины')
      return false
    }

    try {
      // Используем новый сервис для очистки корзины
      await CartService.clearCart(user.id)
      // Очищаем локальное состояние корзины
      setItems([])
      console.log('✅ Корзина очищена')
      return true
    } catch (error) {
      console.error('❌ Ошибка очистки корзины:', error)
      return false
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