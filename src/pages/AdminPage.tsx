
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Users, 
  ShoppingCart, 
  MessageSquare, 
  TrendingUp, 
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { api } from '../services/api'

interface AdminStats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  pendingMessages: number
}

interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  created_at: string
}

interface ContactMessage {
  id: string
  name: string
  phone: string
  email?: string
  message: string
  preferred_contact: string
  status: string
  created_at: string
}

const AdminPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'messages' | 'users'>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Проверка прав администратора (отключаем эвристику по email)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user?.id || '')
          .single()
        if (!error && data) setIsAdmin(Boolean(data.is_admin))
      } catch {}
    })()
  }, [user?.id])

  useEffect(() => {
    if (isAdmin) {
      loadAdminData()
    }
  }, [isAdmin])

  const loadAdminData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadOrders(),
        loadMessages()
      ])
    } catch (error) {
      console.error('Ошибка загрузки админских данных:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Загружаем статистику
      const [usersCount, ordersCount, messagesCount] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new')
      ])

      const totalRevenue = ordersCount.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

      setStats({
        totalUsers: usersCount.count || 0,
        totalOrders: ordersCount.count || 0,
        totalRevenue,
        pendingMessages: messagesCount.count || 0
      })
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    }
  }

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
      
      console.log('✅ Статус заказа обновлен')
    } catch (error) {
      console.error('Ошибка обновления статуса заказа:', error)
    }
  }

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', messageId)

      if (error) throw error
      
      setMessages(messages.map(message => 
        message.id === messageId ? { ...message, status: newStatus } : message
      ))
      
      console.log('✅ Статус сообщения обновлен')
    } catch (error) {
      console.error('Ошибка обновления статуса сообщения:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU')
  }

  // Серверная проверка прав
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    const check = async () => {
      try {
        const ok = await api.adminCheck()
        setServerAllowed(ok)
      } catch {
        setServerAllowed(false)
      }
    }
    check()
  }, [])

  if (serverAllowed === false || (!isAdmin && serverAllowed !== null)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Доступ запрещен</h1>
          <p className="text-gray-600 mb-4">У вас нет прав для доступа к админской панели</p>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_phone.includes(searchTerm) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.phone.includes(searchTerm) ||
                         message.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Админская панель</h1>
          </div>
        </div>

        {/* Навигация */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <TrendingUp className="inline w-5 h-5 mr-2" />
              Обзор
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'orders'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <ShoppingCart className="inline w-5 h-5 mr-2" />
              Заказы ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'messages'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <MessageSquare className="inline w-5 h-5 mr-2" />
              Сообщения ({messages.length})
            </button>
          </div>
        </div>

        {/* Контент */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Пользователи</p>
                    <p className="text-3xl font-bold text-gray-800">{stats?.totalUsers || 0}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Заказы</p>
                    <p className="text-3xl font-bold text-gray-800">{stats?.totalOrders || 0}</p>
                  </div>
                  <ShoppingCart className="w-12 h-12 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Выручка</p>
                    <p className="text-3xl font-bold text-gray-800">{formatPrice(stats?.totalRevenue || 0)}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-purple-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Новые сообщения</p>
                    <p className="text-3xl font-bold text-gray-800">{stats?.pendingMessages || 0}</p>
                  </div>
                  <MessageSquare className="w-12 h-12 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Последние заказы */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Последние заказы</h2>
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">{order.customer_phone}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(order.total_amount)}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md">
            {/* Фильтры */}
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Поиск по имени, телефону или ID заказа..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все статусы</option>
                    <option value="new">Новые</option>
                    <option value="confirmed">Подтвержденные</option>
                    <option value="processing">В обработке</option>
                    <option value="shipped">Отправленные</option>
                    <option value="delivered">Доставленные</option>
                    <option value="cancelled">Отмененные</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Список заказов */}
            <div className="divide-y">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Заказ #{order.id.slice(-8)}</h3>
                      <p className="text-gray-600">{order.customer_name}</p>
                      <p className="text-gray-600">{order.customer_phone}</p>
                      {order.customer_email && (
                        <p className="text-gray-600">{order.customer_email}</p>
                      )}
                      <p className="text-gray-600">{order.customer_address}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatPrice(order.total_amount)}</p>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="mt-2 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="new">Новый</option>
                        <option value="confirmed">Подтвержден</option>
                        <option value="processing">В обработке</option>
                        <option value="shipped">Отправлен</option>
                        <option value="delivered">Доставлен</option>
                        <option value="cancelled">Отменен</option>
                      </select>
                    </div>
                  </div>

                  {/* Товары в заказе */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Товары:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.name} x {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-md">
            {/* Фильтры */}
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Поиск по имени, телефону или сообщению..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все статусы</option>
                    <option value="new">Новые</option>
                    <option value="processed">Обработанные</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Список сообщений */}
            <div className="divide-y">
              {filteredMessages.map((message) => (
                <div key={message.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{message.name}</h3>
                      <p className="text-gray-600">{message.phone}</p>
                      {message.email && (
                        <p className="text-gray-600">{message.email}</p>
                      )}
                      <p className="text-sm text-gray-500">{formatDate(message.created_at)}</p>
                      <p className="text-sm text-gray-500">
                        Предпочитаемый способ связи: {message.preferred_contact}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMessageStatus(message.id, 'processed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Отметить как обработанное"
                      >
                        <CheckCircle size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Сообщение:</h4>
                    <p className="text-gray-700">{message.message}</p>
                  </div>

                  <div className="mt-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      message.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {message.status === 'new' ? 'Новое' : 'Обработано'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage
