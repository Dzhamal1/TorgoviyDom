import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Package } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { saveOrder } from '../services/notificationService';

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
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = (productId: string) => {
    if (confirm('Удалить товар из корзины?')) {
      removeItem(productId);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Корзина пуста');
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
      totalAmount: totalPrice,
      userId: user?.id,
    };

    console.log('📦 Данные заказа подготовлены:', orderData.orderId)

    try {
      const result = await saveOrder(orderData);
      
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
          {/* Товары в корзине */}
          <div className="lg:col-span-2 space-y-4">
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
                        target.src = 'https://via.placeholder.com/96x96/f3f4f6/9ca3af?text=Нет+фото';
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
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Оформление заказа</h2>
              
              {/* Итоги заказа */}
              <div className="space-y-3 mb-6 pb-6 border-b">
                <div className="flex justify-between text-gray-600">
                  <span>Товары ({totalItems} шт.):</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Доставка:</span>
                  <span className="text-green-600">Бесплатно</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-800 pt-3 border-t">
                  <span>Итого:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>

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
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
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
                  <textarea
                    required
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Укажите полный адрес доставки"
                  />
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