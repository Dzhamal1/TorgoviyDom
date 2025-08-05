
import React, { useState } from 'react'
import { User, Save, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../UI/LoadingSpinner'

interface UserProfileProps {
  isOpen: boolean
  onClose: () => void
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen || !user) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    const result = await updateProfile(formData)
    
    if (result.success) {
      setSuccess('Профиль успешно обновлен')
      setIsEditing(false)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(result.error || 'Ошибка обновления профиля')
    }
    
    setIsLoading(false)
  }

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      address: user?.address || ''
    })
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <User className="mr-2" size={24} />
            Профиль пользователя
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Email (только для чтения) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>

          {/* Полное имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+7 (900) 123-45-67"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          {/* Адрес доставки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Адрес доставки
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Укажите полный адрес для доставки"
              rows={3}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          {/* Информация об аккаунте */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-800 mb-2">Информация об аккаунте</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">ID:</span> {user.id}</p>
              <p><span className="font-medium">Дата регистрации:</span> {new Date(user.created_at).toLocaleDateString('ru-RU')}</p>
              <p><span className="font-medium">Последнее обновление:</span> {new Date(user.updated_at).toLocaleDateString('ru-RU')}</p>
              {user.is_admin && (
                <p><span className="font-medium text-blue-600">Статус:</span> Администратор</p>
              )}
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-3 mt-6">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Редактировать
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Закрыть
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <LoadingSpinner /> : (
                  <>
                    <Save size={16} className="mr-1" />
                    Сохранить
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
