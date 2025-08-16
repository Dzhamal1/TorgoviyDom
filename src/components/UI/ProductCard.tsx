import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
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
    
    if (buttonState === 'loading') return;
    
    setButtonState('loading');
    
    try {
      await addItem(product, quantity);
      setButtonState('success');
      // Возвращаем в обычное состояние через 1.5 секунды
      setTimeout(() => {
        setButtonState('default');
      }, 1500);
    } catch (error) {
      console.error('Ошибка добавления товара:', error);
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
        return 'bg-orange-500 hover:bg-orange-600';
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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1 overflow-hidden group">
      <Link to={`/product/${product.id}`}>
        <div className="relative h-56 bg-gray-100 flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <img
              src="/product-placeholder.svg"
              alt="Нет изображения"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )}
          
          {currentQuantityInCart > 0 && (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              В корзине: {currentQuantityInCart}
            </div>
          )}
          
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>
        {product.sizes && (
          <p className="text-gray-600 text-sm mb-1">Размеры: {product.sizes}</p>
        )}
        {product.manufacturer && (
          <p className="text-gray-600 text-sm mb-2">Производитель: {product.manufacturer}</p>
        )}
        <p className="text-gray-700 text-sm line-clamp-3 mb-3">{product.description}</p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(product.price)}
          </span>
          
          <span />
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
              disabled={quantity <= 1}
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
              disabled={false}
              className="px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {/* Кнопка добавления в корзину */}
          <button
            onClick={handleAddToCart}
            disabled={isLoading || buttonState === 'loading'}
            className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 text-white font-medium flex items-center justify-center space-x-2 ${getButtonColor()} disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
            title={'Добавить в корзину'}
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