import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Plus, Minus, Check, Package } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, getItemQuantity, isLoading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [buttonState, setButtonState] = useState<'default' | 'loading' | 'success'>('default');

  if (!product) {
    return null;
  }

  const currentQuantityInCart = getItemQuantity(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ИСПРАВЛЕНИЕ 1: Убираем блокировку для товаров в наличии
    if (!product.inStock) {
      console.warn('Товар недоступен:', product.name);
      return;
    }
    
    if (buttonState === 'loading') {
      console.warn('Товар уже добавляется в корзину');
      return;
    }
    
    setButtonState('loading');
    
    try {
      console.log('🛒 Добавляем товар в корзину:', product.name, 'количество:', quantity);
      await addItem(product, quantity);
      setButtonState('success');
      
      // Возвращаем в обычное состояние через 1.5 секунды
      setTimeout(() => {
        setButtonState('default');
      }, 1500);
    } catch (error) {
      console.error('Ошибка добавления товара:', error);
      alert('Ошибка при добавлении товара в корзину. Попробуйте еще раз.');
      setButtonState('default');
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <div className="animate-spin">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
        );
      case 'success':
        return <Check size={20} className="text-white animate-bounce" />;
      default:
        return <ShoppingCart size={20} />;
    }
  };

  const getButtonColor = () => {
    switch (buttonState) {
      case 'loading':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      default:
        return product.inStock ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-200';
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'loading':
        return 'Добавляем...';
      case 'success':
        return 'Добавлено!';
      default:
        return 'В корзину';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <Link to={`/product/${product.id}`}>
        <div className="relative h-48 bg-gray-100 flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="text-gray-400">
              <Package size={48} />
            </div>
          )}
          
          {!product.inStock && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
              Нет в наличии
            </div>
          )}
          
          {currentQuantityInCart > 0 && (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              В корзине: {currentQuantityInCart}
            </div>
          )}
          
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye size={24} className="text-white" />
          </div>
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {product.description}
        </p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(product.price)}
          </span>
          
          <span className={`text-xs px-2 py-1 rounded-full ${
            product.inStock 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {product.inStock ? 'В наличии' : 'Нет в наличии'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Селектор количества */}
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuantityChange(quantity - 1);
              }}
              disabled={!product.inStock || quantity <= 1}
              className="px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const value = Math.max(1, parseInt(e.target.value) || 1);
                handleQuantityChange(value);
              }}
              className="w-16 text-center bg-transparent border-0 focus:outline-none text-sm font-medium py-2"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuantityChange(quantity + 1);
              }}
              disabled={!product.inStock}
              className="px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {/* Кнопка добавления в корзину */}
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock || buttonState === 'loading'}
            className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 text-white font-medium flex items-center justify-center space-x-2 ${getButtonColor()} ${!product.inStock ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'} shadow-md`}
            title={product.inStock ? 'Добавить в корзину' : 'Товара нет в наличии'}
          >
            {getButtonContent()}
            <span className="text-sm">
              {getButtonText()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;