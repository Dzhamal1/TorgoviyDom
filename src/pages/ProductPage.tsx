import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Star, Truck, Shield, ArrowLeft, Plus, Minus, Package } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import ProductCard from '../components/UI/ProductCard';

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { state, dispatch } = useApp();
  const { addItem } = useCart();
  const [quantity, setQuantity] = React.useState(1);

  const product = state.products.find(p => p.id === productId);
  const relatedProducts = state.products
    .filter(p => p.id !== productId && p.category === product?.category)
    .slice(0, 4);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Товар не найден</h1>
        <p className="text-gray-600 mb-8">Запрашиваемый товар не существует или был удален</p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Вернуться на главную</span>
        </Link>
      </div>
    );
  }

  const handleAddToCart = async () => {
    try {
      await addItem(product, quantity);
    } catch (error) {
      console.error('Ошибка добавления товара в корзину:', error);
      alert('Ошибка при добавлении товара в корзину. Попробуйте еще раз.');
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

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Категории', href: '/categories' },
    { label: product.category, href: `/category/${getCategoryIdByName(product.category)}` },
    { label: product.name },
  ];

  // Функция для получения ID категории по названию
  function getCategoryIdByName(categoryName: string): string {
    const categoryMap: { [key: string]: string } = {
      'Стройматериалы': 'stroy',
      'Электрика': 'electrical',
      'Инструменты': 'tools',
      'Сантехника': 'plumbing', 
      'Мебель': 'furniture',
      'Интерьер': 'interior',
      'Крепежи': 'fasteners',
    };
    return categoryMap[categoryName] || categoryName.toLowerCase();
  }

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-96 lg:h-[500px] object-cover"
                loading="eager"
                decoding="async"
                sizes="(max-width: 1024px) 100vw, 50vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/1198802/pexels-photo-1198802.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop';
                }}
              />
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <Link
                to={`/category/${product.category.toLowerCase()}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {product.category}
              </Link>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-4">{product.name}</h1>

            <div className="flex items-center space-x-4 mb-6">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="currentColor" />
                ))}
              </div>
              <span className="text-sm text-gray-600">4.8 (24 отзыва)</span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-blue-600">
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                product.inStock 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.inStock ? 'В наличии' : 'Нет в наличии'}
              </span>
            </div>

            <div className="space-y-4 mb-8">
              {/* Селектор количества */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Количество:</span>
                <div className="flex items-center bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={!product.inStock}
                    className="px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Minus size={20} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      handleQuantityChange(value);
                    }}
                    className="w-20 text-center bg-transparent border-0 focus:outline-none py-3 text-lg font-semibold"
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={!product.inStock}
                    className="px-4 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  product.inStock
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart size={20} />
                <span>
                  {product.inStock ? `Добавить в корзину (${quantity} шт.)` : 'Товара нет в наличии'}
                </span>
              </button>

              <Link
                to="/cart"
                className="w-full py-3 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                Перейти в корзину
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Truck className="text-blue-600" size={24} />
                <div>
                  <p className="font-medium text-sm">Быстрая доставка</p>
                  <p className="text-xs text-gray-600">По всей России</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="text-green-600" size={24} />
                <div>
                  <p className="font-medium text-sm">Гарантия качества</p>
                  <p className="text-xs text-gray-600">Сертифицированный товар</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Нужна консультация?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Наши специалисты помогут с выбором и ответят на все вопросы
              </p>
              <a
                href="tel:+79001234567"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                +7 (900) 123-45-67
              </a>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Описание товара</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Похожие товары</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;