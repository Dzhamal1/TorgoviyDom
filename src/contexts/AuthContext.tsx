import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 Инициализация AuthProvider...')
    
    // Получаем текущую сессию с обработкой ошибок
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Ошибка получения сессии:', error.message)
          setLoading(false)
          return
        }
        
        console.log('📋 Текущая сессия:', session ? 'найдена' : 'отсутствует')
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Загружаем профиль пользователя:', session.user.email)
          await loadProfile(session.user.id)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('❌ Критическая ошибка инициализации auth:', error)
        setLoading(false)
      }
    }
    
    initializeAuth()

    // Слушаем изменения аутентификации с улучшенной обработкой
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user')
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ Пользователь вошел:', session.user.email)
          await loadProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Пользователь вышел')
          setProfile(null)
          // Очищаем localStorage от данных сессии
          try {
            localStorage.removeItem('supabase.auth.token')
          } catch (error) {
            console.warn('Ошибка очистки localStorage:', error)
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Токен обновлен для:', session.user.email)
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('🧹 Очистка AuthProvider subscription')
      subscription.unsubscribe()
    }
  }, [])

  // Загрузка профиля пользователя с retry логикой и автоматическим созданием
  const loadProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log('🔄 Загружаем профиль пользователя:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Профиль не найден, пытаемся создать...')
          
          // Попытка создать профиль если он не был создан автоматически
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) {
            await createProfileIfNotExists(userData.user)
            // Повторная попытка загрузки после создания
            setTimeout(() => loadProfile(userId, retryCount), 1000)
          }
          return
        }
        
        console.error('❌ Ошибка загрузки профиля:', error.message)
        
        // Retry логика для сетевых ошибок
        if (retryCount < 2 && (error.message.includes('connection') || error.message.includes('network'))) {
          console.log(`🔄 Повторная попытка загрузки профиля (${retryCount + 1}/3)...`)
          setTimeout(() => loadProfile(userId, retryCount + 1), 2000)
          return
        }
        
        return
      }

      console.log('✅ Профиль загружен:', data.full_name || data.email)
      setProfile(data)
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки профиля:', error)
      
      if (retryCount < 2) {
        console.log(`🔄 Повторная попытка загрузки профиля (${retryCount + 1}/3)...`)
        setTimeout(() => loadProfile(userId, retryCount + 1), 3000)
      }
    }
  }

  // Создание профиля если он не был создан автоматически триггером
  const createProfileIfNotExists = async (user: User) => {
    try {
      console.log('🔄 Создаем профиль пользователя:', user.email)
      
      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        phone: user.user_metadata?.phone || null,
      }

      const { error } = await supabase
        .from('profiles')
        .insert([profileData])

      if (error) {
        if (error.code === '23505') {
          console.log('ℹ️ Профиль уже существует')
          return
        }
        console.error('❌ Ошибка создания профиля:', error.message)
        return
      }

      console.log('✅ Профиль создан успешно')
    } catch (error) {
      console.error('❌ Критическая ошибка создания профиля:', error)
    }
  }

  // Регистрация с улучшенной обработкой ошибок
  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      console.log('🔄 Начинаем регистрацию пользователя:')
      console.log('📧 Email:', email)
      console.log('👤 Имя:', fullName)
      console.log('📱 Телефон:', phone || 'не указан')
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          }
        }
      })

      if (error) {
        console.error('❌ Детальная ошибка регистрации:')
        console.error('Код ошибки:', error.status)
        console.error('Сообщение:', error.message)
        
        // Специфичная обработка ошибок
        if (error.message.includes('User already registered')) {
          return { error: { ...error, message: 'Пользователь с таким email уже существует' } }
        }
        if (error.message.includes('signup is disabled')) {
          return { error: { ...error, message: 'Регистрация отключена в настройках Supabase' } }
        }
        if (error.message.includes('Invalid API key')) {
          return { error: { ...error, message: 'Ошибка конфигурации. Проверьте настройки Supabase' } }
        }
        if (error.message.includes('ERR_CONNECTION_RESET')) {
          return { error: { ...error, message: 'Проблема с соединением. Попробуйте позже' } }
        }
        if (error.message.includes('Failed to fetch')) {
          return { error: { ...error, message: 'Не удается подключиться к серверу' } }
        }
        
        return { error }
      }

      console.log('✅ Регистрация успешна!')
      console.log('👤 Пользователь создан:', data.user?.email)
      
      // Проверяем, нужно ли подтверждение email
      if (data.user && !data.user.email_confirmed_at) {
        console.log('📧 Email подтвержден автоматически или не требует подтверждения')
      }

      // Если пользователь создан и автоматически вошел, загружаем профиль
      if (data.user && data.session) {
        console.log('🔄 Пользователь автоматически авторизован, загружаем профиль...')
        // Небольшая задержка для обработки триггера создания профиля
        setTimeout(() => {
          loadProfile(data.user!.id)
        }, 1500)
      }

      return { error: null }
    } catch (error) {
      console.error('❌ Исключение при регистрации:', error.message)
      
      if (error.message.includes('ERR_CONNECTION_RESET')) {
        return { error: { message: 'Соединение прервано. Попробуйте еще раз' } }
      }
      if (error.message.includes('Failed to fetch')) {
        return { error: { message: 'Не удается подключиться к серверу' } }
      }
      
      return { error: { message: 'Произошла ошибка при регистрации' } }
    }
  }

  // Вход с улучшенной обработкой ошибок
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 Попытка входа для:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Ошибка входа:', error.message)
        
        if (error.message.includes('Invalid login credentials')) {
          return { error: { ...error, message: 'Неверный email или пароль' } }
        }
        if (error.message.includes('ERR_CONNECTION_RESET')) {
          return { error: { ...error, message: 'Проблема с соединением. Попробуйте позже' } }
        }
        if (error.message.includes('Failed to fetch')) {
          return { error: { ...error, message: 'Не удается подключиться к серверу' } }
        }
        
        return { error }
      }
      
      console.log('✅ Успешный вход:', data.user?.email)
      return { error: null }
    } catch (error) {
      console.error('❌ Исключение при входе:', error.message)
      return { error: { message: 'Произошла ошибка при входе' } }
    }
  }

  // Выход с принудительной очисткой
  const signOut = async () => {
    try {
      console.log('🔄 Выход из аккаунта...')
      
      // Принудительно очищаем локальное состояние
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // Очищаем localStorage
      try {
        localStorage.removeItem('supabase.auth.token')
        localStorage.clear() // Полная очистка для надежности
      } catch (error) {
        console.warn('Ошибка очистки localStorage:', error)
      }
      
      // Выходим через Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Ошибка выхода:', error.message)
        // Даже если есть ошибка, локальное состояние уже очищено
      } else {
        console.log('✅ Успешный выход')
      }
      
      // Перезагружаем страницу для полной очистки состояния
      setTimeout(() => {
        window.location.reload()
      }, 100)
      
    } catch (error) {
      console.error('❌ Критическая ошибка выхода:', error)
      
      // В любом случае очищаем состояние и перезагружаем
      setUser(null)
      setProfile(null)
      setSession(null)
      
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }

  // Обновление профиля
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      console.log('🔄 Обновление профиля:', updates)
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        console.error('❌ Ошибка обновления профиля:', error.message)
        return { error }
      }

      console.log('✅ Профиль обновлен')
      setProfile(prev => prev ? { ...prev, ...updates } : null)
      return { error: null }
    } catch (error) {
      console.error('❌ Критическая ошибка обновления профиля:', error)
      return { error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}