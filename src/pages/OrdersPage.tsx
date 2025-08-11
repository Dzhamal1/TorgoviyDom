import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Receipt, ShoppingCart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface OrderItemRow {
  name: string
  price: number
  quantity: number
}

interface OrderRow {
  id: string
  created_at: string
  total_amount: number
  status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItemRow[]
}

const OrdersPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, created_at, total_amount, status, items')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (e) {
        console.error('Ошибка загрузки заказов:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const totalSpent = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [orders]
  )

  const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(price)
  const formatDate = (d: string) => new Date(d).toLocaleString('ru-RU')

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <ShoppingCart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Войдите, чтобы видеть заказы</h1>
          <p className="text-gray-600 mb-6">Авторизуйтесь, чтобы просматривать историю и статус ваших заказов</p>
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
          <h1 className="text-3xl font-bold text-gray-800">Мои заказы</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Загрузка...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Receipt className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Пока нет заказов</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Заказ #{order.id.slice(-8)}</h3>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatPrice(order.total_amount)}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded p-4">
                    <h4 className="font-medium mb-2">Товары:</h4>
                    <div className="space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{it.name} × {it.quantity}</span>
                          <span>{formatPrice(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Всего заказов</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Общая сумма</p>
                  <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
                </div>
                <Receipt className="w-10 h-10 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrdersPage


