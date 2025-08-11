
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '../lib/mysql'
import { AuthService } from '../services/authService'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ data: any; error: any }>
  refreshProfile: () => Promise<void>
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
    // Получаем текущую сессию
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Ошибка получения сессии:', error)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Критическая ошибка получения сессии:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Слушаем изменения аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Изменение состояния аутентификации:', event)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      try { authListener.subscription?.unsubscribe() } catch {}
    }
  }, [])

  const verifyTokenAndSetUser = async (token: string) => {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || status === 406 || !data) {
        // Профиль не найден или сервер вернул 406 — создаем/обновляем профиль
        console.log('Профиль не найден, создаем/обновляем профиль...')
        const fullName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Пользователь'
        const phone = (user?.user_metadata as any)?.phone || null

        const { data: upserted, error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: user?.email || '',
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .single()

        if (upsertError) {
          console.error('Ошибка создания/обновления профиля:', upsertError)
          return
        }

        setProfile(upserted)
        console.log('✅ Профиль создан/обновлен')
        return
      }

      setProfile(data)
      console.log('✅ Профиль пользователя загружен')
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

  const signOut = async () => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Ошибка выхода:', error)
        // Жесткая очистка локального состояния, даже если SDK вернул ошибку
        setUser(null)
        setProfile(null)
        setSession(null)
        localStorage.removeItem('cart')
        return
      }

      setUser(null)
      setProfile(null)
      setSession(null)
      localStorage.removeItem('cart')
      
      console.log('✅ Пользователь вышел из системы')
    } catch (error) {
      console.error('Критическая ошибка выхода:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' }
    }

    try {
      const updatedUser = await AuthService.updateProfile(user.id, updates)
      setUser(updatedUser)
      console.log('✅ Профиль обновлен')
      return { data, error: null }
    } catch (error) {
      console.error('Критическая ошибка обновления профиля:', error)
      return { data: null, error }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  // Вычисляем, является ли пользователь администратором
  const isAdmin = profile?.is_admin === true

  const value: AuthContextType = {
    user,
    isLoading,
    isAdmin,
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
