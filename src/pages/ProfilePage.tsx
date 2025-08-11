import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Save, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setEmail(user?.email || '')
  }, [profile, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await updateProfile({ full_name: fullName, phone })
      if (email && email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) {
          throw error
        }
        alert('Email обновлен. Подтвердите новый адрес через письмо, отправленное на почту')
      }
      await refreshProfile()
      if (!email || email === user.email) {
        alert('Профиль сохранен')
      }
    } catch (e) {
      console.error(e)
      alert('Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Войдите, чтобы видеть профиль</h1>
          <p className="text-gray-600 mb-6">Авторизуйтесь для доступа к настройкам профиля</p>
          <Link to="/" className="text-blue-600 hover:text-blue-800">На главную</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Настройки профиля</h1>
        </div>

        <div className="max-w-2xl bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите ФИО"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">При изменении email потребуется подтверждение по письму</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage


