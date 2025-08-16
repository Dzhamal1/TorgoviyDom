import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, Clock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getMockCategories, getMockProducts } from '../services/googleSheetsApi';
import { api } from '../services/api';
import CategoryCard from '../components/UI/CategoryCard';
import ProductCard from '../components/UI/ProductCard';
import ContactForm from '../components/UI/ContactForm';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import HowItWorks from '../components/HowItWorks';

const HomePage: React.FC = () => {
  const { state, dispatch } = useApp();

  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      try {
        console.log('Начинаем загрузку данных...');
        
        // Загружаем товары (через Edge Function)
        const products = await api.getProducts();
        console.log('Товары загружены:', products.length);
        
        // Загружаем категории
        const categories = getMockCategories();
        console.log('Категории загружены:', categories.length);
        
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        dispatch({ type: 'SET_CATEGORIES', payload: categories });
        
      } catch (error) {
        console.log('Ошибка при загрузке, используем мок-данные');
        
        // Fallback к мок-данным
        const products = getMockProducts();
        const categories = getMockCategories();
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        dispatch({ type: 'SET_CATEGORIES', payload: categories });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadData();
  }, [dispatch]);

  const featuredProducts = state.products?.slice(0, 8) || [];
  const advantages = [
    {
      icon: Shield,
      title: 'Гарантия качества',
      description: 'Все товары сертифицированы и соответствуют ГОСТ',
    },
    {
      icon: Truck,
      title: 'Быстрая доставка',
      description: 'Доставка по республике за 1-2 дня',
    },
    {
      icon: Clock,
      title: 'Работаем для вас',
      description: 'Пн-Пт: 9:00-18:00',
    },
    {
      icon: Shield,
      title: 'Лучшие цены',
      description: 'Конкурентные цены от производителей',
    },
  ];

  if (state.loading) {
    return (
      <LoadingSpinner 
        size="large" 
        text="Загружаем каталог товаров..." 
        fullScreen={true} 
      />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Все для стройки в одном месте
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Качественные строительные материалы, инструменты и оборудование от надежных производителей. 
              Доставка по всей России.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/category/stroy"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
              >
                Посмотреть каталог
                <ArrowRight size={20} className="ml-2" />
              </Link>
              <a
                href="tel:+79001234567"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
              >
                Позвонить сейчас
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Категории товаров</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Выберите категорию и найдите все необходимое для вашего строительного проекта
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {state.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Рекомендуемые товары</h2>
              <p className="text-gray-600">Популярные товары по выгодным ценам</p>
              {/* Мобильная кнопка под подзаголовком */}
              <Link
                to="/search"
                className="md:hidden inline-flex items-center mt-3 text-blue-600 hover:text-blue-800 font-medium"
              >
                Смотреть все
                <ArrowRight size={20} className="ml-1" />
              </Link>
            </div>
            <Link
              to="/search"
              className="hidden md:flex text-blue-600 hover:text-blue-800 font-medium items-center"
            >
              Смотреть все
              <ArrowRight size={20} className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Почему выбирают нас</h2>
            <p className="text-gray-600">Наши преимущества, которые делают покупки удобными</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((advantage, index) => (
              <div
                key={index}
                className="group bg-white p-6 rounded-lg shadow-md text-center transition-transform duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-200 group-hover:scale-110">
                  <advantage.icon size={32} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{advantage.title}</h3>
                <p className="text-gray-600 text-sm">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (из schema) */}
      <HowItWorks />

      {/* Contact Form */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Остались вопросы?</h2>
              <p className="text-gray-600">
                Свяжитесь с нами, и наши специалисты помогут подобрать нужные товары
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;