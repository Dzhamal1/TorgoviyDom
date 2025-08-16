import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { saveOrder } from '../services/notificationService';
import { api } from '../services/api';

const CartPage: React.FC = () => {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<null | 'success' | 'error'>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ value: string; lat: number | null; lon: number | null }>>([]);
  // const [selectedCoords, setSelectedCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [delivery, setDelivery] = useState<{ distance_km: number; cost_rub: number } | null>(null);
  const navigate = useNavigate();

  // При входе на страницу корзины прокручиваем вверх
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalWithDelivery = useMemo(() => {
    return totalPrice + (delivery?.cost_rub || 0)
  }, [totalPrice, delivery])

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = (productId: string) => {
    if (confirm('Удалить товар из корзины?')) {
      removeItem(productId);
    }
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 11 && (cleaned[0] === '7' || cleaned[0] === '8')
  }

  const validateEmail = (email: string): boolean => {
    if (!email) return true // email необязательный
    const at = email.indexOf('@')
    if (at <= 0 || at === email.length - 1) return false
    const domain = email.slice(at + 1)
    return domain.includes('.')
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Корзина пуста');
      return;
    }

    if (!validatePhone(customerInfo.phone)) {
      alert('Введите корректный номер телефона в формате 7XXXXXXXXXX или 8XXXXXXXXXX');
      return;
    }

    if (!validateEmail(customerInfo.email)) {
      alert('Введите корректный email (например, name@domain.ru) или оставьте поле пустым');
      return;
    }
    
    console.log('🔄 Начинаем оформление заказа...')
    setIsOrdering(true);

    const orderData = {
      orderId: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerEmail: customerInfo.email,
      customerAddress: customerInfo.address,
      items: items.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      totalAmount: totalWithDelivery,
      userId: user?.id,
      delivery: delivery || undefined
    };

    console.log('📦 Данные заказа подготовлены:', orderData.orderId)

    try {
      // Fix: Only include userId if it is defined, to match the expected type
      const { userId, ...restOrderData } = orderData;
      const result = await saveOrder(
        userId ? { ...restOrderData, userId } : restOrderData
      );
      
      console.log('📋 Результат сохранения заказа:', result)
      
      if (result.success) {
        console.log('✅ Заказ успешно обработан')
        clearCart();
        setOrderPlaced('success');
        setTimeout(() => {
          navigate('/orders', { replace: true });
        }, 1500);
      } else {
        console.error('❌ Ошибка обработки заказа:', result.error)
        setOrderPlaced('error');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setOrderPlaced('error');
    } finally {
      console.log('🏁 Завершение обработки заказа')
      setIsOrdering(false);
    }
  };

  const renderOrderToast = () => {
    if (orderPlaced === 'success') {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
            Заказ успешно оформлен! Перенаправляем к вашим заказам...
          </div>
        </div>
      )
    }
    if (orderPlaced === 'error') {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
            Не удалось оформить заказ. Попробуйте еще раз.
          </div>
        </div>
      )
    }
    return null
  }

  const handleAddressInput = async (value: string) => {
    setAddressQuery(value)
    setCustomerInfo({ ...customerInfo, address: value })
    if (value.trim().length < 3) { setAddressSuggestions([]); return }
    try {
      const suggestions = await api.addressAutocomplete(value)
      setAddressSuggestions(suggestions)
    } catch { setAddressSuggestions([]) }
  }

  const handlePickSuggestion = async (s: { value: string; lat: number | null; lon: number | null }) => {
    setCustomerInfo({ ...customerInfo, address: s.value })
    setAddressQuery(s.value)
    setAddressSuggestions([])
    // setSelectedCoords({ lat: s.lat, lon: s.lon })
    if (s.lat != null && s.lon != null) {
      try { setDelivery(await api.deliveryCost(s.lat, s.lon)) } catch { setDelivery(null) }
    }
  }

  // Если корзина пуста
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-2 mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Корзина</h1>
          </div>

          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-400 mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={32} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Корзина пуста</h2>
            <p className="text-gray-600 mb-6">
              Добавьте товары в корзину, чтобы оформить заказ
            </p>
            <div className="space-y-3">
              <Link
                to="/"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Продолжить покупки
              </Link>
              <Link
                to="/search"
                className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Посмотреть каталог
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderOrderToast()}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Корзина</h1>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Итоги и форма (поменяли местами: форма наверху справа, итоги вниз) */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/product-placeholder.svg';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-1">{item.product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.product.category}</p>
                    <p className="text-lg font-bold text-blue-600 mb-3">
                      {formatPrice(item.product.price)}
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Управление количеством */}
                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          className="px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = Math.max(1, parseInt(e.target.value) || 1);
                            handleQuantityChange(item.product.id, value);
                          }}
                          className="w-16 text-center bg-transparent border-0 focus:outline-none py-2 font-medium"
                        />
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          className="px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Кнопка удаления */}
                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Удалить товар"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Общая стоимость товара */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} × {formatPrice(item.product.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Оформление заказа */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Оформление заказа</h2>

              {/* Форма заказа */}
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={(() => {
                      const raw = String(customerInfo.phone || '')
                      const d = raw.replace(/\D/g, '')
                      const normalized = d.startsWith('8') ? ('7' + d.slice(1)) : d
                      const s = normalized.padEnd(11, '_')
                      const a = s.slice(1, 4)
                      const b = s.slice(4, 7)
                      const c2 = s.slice(7, 9)
                      const d2 = s.slice(9, 11)
                      return `+7 (${a}) ${b}-${c2}-${d2}`
                    })()}
                    onChange={(e) => {
                      const onlyDigits = (e.target.value || '').replace(/\D/g, '')
                      const normalized = onlyDigits.startsWith('8') ? '7' + onlyDigits.slice(1) : onlyDigits
                      const capped = normalized.slice(0, 11)
                      setCustomerInfo({ ...customerInfo, phone: capped })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Адрес доставки *
                  </label>
                  <div className="relative">
                    <input
                      required
                      value={addressQuery}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Начните вводить адрес..."
                    />
                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {addressSuggestions.map((s, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handlePickSuggestion(s)}
                            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            {s.value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {delivery && (
                    <p className="text-xs text-gray-500 mt-1">Расстояние: {Math.ceil(delivery.distance_km)} км; Стоимость: {formatPrice(delivery.cost_rub)}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isOrdering || items.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isOrdering ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Оформляется...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      <span>Оформить заказ</span>
                    </>
                  )}
                </button>
              </form>

              {/* Итоги заказа (переместил вниз) */}
              <div className="space-y-3 mt-6 pt-6 border-t">
                <div className="flex justify-between text-gray-600">
                  <span>Товары ({totalItems} шт.):</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Доставка:</span>
                  <span>{delivery ? formatPrice(delivery.cost_rub) : '—'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-800 pt-3 border-t">
                  <span>Итого:</span>
                  <span>{formatPrice(totalWithDelivery)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Нажимая "Оформить заказ", вы соглашаетесь с условиями обработки персональных данных
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;