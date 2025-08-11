
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
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

  const loadUserProfile = async (userId: string) => {
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
      console.error('Критическая ошибка загрузки профиля:', error)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || ''
          }
        }
      })

      if (error) {
        console.error('Ошибка регистрации:', error)
        return { data: null, error }
      }

      console.log('✅ Пользователь зарегистрирован:', email)
      return { data, error: null }
    } catch (error) {
      console.error('Критическая ошибка регистрации:', error)
      return { data: null, error }
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Ошибка входа:', error)
        return { data: null, error }
      }

      console.log('✅ Пользователь вошел в систему:', email)
      return { data, error: null }
    } catch (error) {
      console.error('Критическая ошибка входа:', error)
      return { data: null, error }
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

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { data: null, error: new Error('Пользователь не авторизован') }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Ошибка обновления профиля:', error)
        return { data: null, error }
      }

      setProfile(data)
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
    profile,
    session,
    isLoading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
