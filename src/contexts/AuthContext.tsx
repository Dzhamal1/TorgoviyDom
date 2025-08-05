
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '../lib/mysql'
import { AuthService } from '../services/authService'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => void
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Проверяем токен в localStorage при загрузке
    const token = localStorage.getItem('auth_token')
    if (token) {
      verifyTokenAndSetUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyTokenAndSetUser = async (token: string) => {
    try {
      const user = await AuthService.verifyToken(token)
      if (user) {
        setUser(user)
      } else {
        localStorage.removeItem('auth_token')
      }
    } catch (error) {
      console.error('Ошибка проверки токена:', error)
      localStorage.removeItem('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      setIsLoading(true)
      const { user, token } = await AuthService.register(email, password, fullName, phone)
      
      localStorage.setItem('auth_token', token)
      setUser(user)
      
      console.log('✅ Пользователь зарегистрирован:', email)
      return { success: true }
    } catch (error: any) {
      console.error('Ошибка регистрации:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { user, token } = await AuthService.login(email, password)
      
      localStorage.setItem('auth_token', token)
      setUser(user)
      
      console.log('✅ Пользователь вошел в систему:', email)
      return { success: true }
    } catch (error: any) {
      console.error('Ошибка входа:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    console.log('✅ Пользователь вышел из системы')
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' }
    }

    try {
      const updatedUser = await AuthService.updateProfile(user.id, updates)
      setUser(updatedUser)
      console.log('✅ Профиль обновлен')
      return { success: true }
    } catch (error: any) {
      console.error('Ошибка обновления профиля:', error)
      return { success: false, error: error.message }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
