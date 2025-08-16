import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Filter, Grid, List, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ProductCard from '../components/UI/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { api } from '../services/api';

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { state, dispatch } = useApp();
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular');
  const [filterInStock, setFilterInStock] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Маппинг ID категорий к их названиям
  const categoryIdToName: { [key: string]: string } = {
    stroy: 'Стройматериалы',
    electrical: 'Электрика', 
    tools: 'Инструменты',
    plumbing: 'Сантехника',
    furniture: 'Мебель',
    interior: 'Интерьер',
    fasteners: 'Крепежи',
  };

  // Обратный маппинг названий категорий к их ID
  const categoryNameToId: { [key: string]: string } = {
    'Стройматериалы': 'stroy',
    'Электрика': 'electrical',
    'Инструменты': 'tools', 
    'Сантехника': 'plumbing',
    'Мебель': 'furniture',
    'Интерьер': 'interior',
    'Крепежи': 'fasteners',
  };

  const mappedCategoryName = categoryIdToName[categoryId || '']
  const currentCategoryName = mappedCategoryName || 'Категория';

  // Фолбэк: при прямом переходе на страницу категории загружаем товары
  useEffect(() => {
    const ensureProductsLoaded = async () => {
      if (state.products && state.products.length > 0) return;
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const products = await api.getProducts();
        dispatch({ type: 'SET_PRODUCTS', payload: products });
      } catch (e) {
        // игнорируем, UI уже умеет показывать отсутствие данных
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    ensureProductsLoaded();
  }, [dispatch, state.products]);

  // Загружаем фильтры с сервера (Edge Function filters)
  useEffect(() => {
    (async () => {
      try {
        const params: any = { ...(selectedClass ? { class: selectedClass } : {}) }
        if (mappedCategoryName) params.category = mappedCategoryName
        const data = await api.getFilters(params);
        let cls = Array.from(new Set((data.classes || []).map(x => (x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        let mans = Array.from(new Set((data.manufacturers || []).map(x => (x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))

        // Резервный расчет на клиенте, если сервер ничего не вернул
        if (cls.length === 0 || mans.length === 0) {
          const inCategory = (state.products || []).filter(p => p.category === currentCategoryName)
          cls = Array.from(new Set(inCategory.map(p => (p.class || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
          const filteredByClass = selectedClass ? inCategory.filter(p => (p.class || '') === selectedClass) : inCategory
          mans = Array.from(new Set(filteredByClass.map(p => (p.manufacturer || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        }
        setClasses(cls)
        setManufacturers(mans)
        setSelectedManufacturers(prev => prev.filter(m => mans.includes(m)))
      } catch (e) {
        // Резерв: считаем на клиенте
        const inCategory = (state.products || []).filter(p => p.category === currentCategoryName)
        const cls = Array.from(new Set(inCategory.map(p => (p.class || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        const filteredByClass = selectedClass ? inCategory.filter(p => (p.class || '') === selectedClass) : inCategory
        const mans = Array.from(new Set(filteredByClass.map(p => (p.manufacturer || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        setClasses(cls)
        setManufacturers(mans)
        setSelectedManufacturers(prev => prev.filter(m => mans.includes(m)))
      }
    })()
  }, [currentCategoryName, selectedClass, state.products])

  const filteredAndSortedProducts = useMemo(() => {
    if (!state.products || state.products.length === 0) {
      return [];
    }
    
    let filtered = state.products.filter(product => {
      // Проверяем соответствие категории товара выбранной категории
      if (categoryId) {
        const expectedCategoryName = categoryIdToName[categoryId];
        if (product.category !== expectedCategoryName) {
          return false;
        }
      }
      // Фильтр по классу
      if (selectedClass && (product.class || '') !== selectedClass) {
        return false;
      }
      // Фильтр по производителю
      if (selectedManufacturers.length > 0) {
        if (!product.manufacturer || !selectedManufacturers.includes(product.manufacturer)) {
          return false;
        }
      }
      // Условие наличия отключено по требованиям
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ru');
        case 'price':
          return a.price - b.price;
        case 'popular':
        default:
          return 0;
      }
    });

    return filtered;
  }, [state.products, categoryId, categoryIdToName, filterInStock, priceRange, sortBy, selectedClass, selectedManufacturers]);

  // Calculate price range for slider
  const maxPrice = useMemo(() => {
    if (!state.products || state.products.length === 0) {
      return 100000;
    }
    
    const categoryProducts = state.products.filter(
      product => !categoryId || product.category === categoryIdToName[categoryId]
    );
    return categoryProducts.length > 0 ? Math.max(...categoryProducts.map(p => p.price)) : 100000;
  }, [state.products, categoryId, categoryIdToName]);

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: currentCategoryName },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [categoryId, selectedClass])

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{currentCategoryName}</h1>
            <p className="text-gray-600">
              Найдено товаров: {filteredAndSortedProducts.length}
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            {/* View mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List size={20} />
              </button>
            </div>

            {/* Кнопка фильтров справа, без текста */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg"
              aria-label="Фильтры"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`w-full lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-4 max-h-[75vh] overflow-y-auto pr-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-gray-800 font-semibold">
                  <Filter size={20} className="mr-2" />
                  <span className="hidden">Фильтры</span>
                </div>
                {/* Сортировка перенесена внутрь панели фильтров */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="popular">По популярности</option>
                    <option value="name">По названию</option>
                    <option value="price">По цене</option>
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Фильтр по классу */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Класс</label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Все классы</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Фильтр по производителю */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Производитель</label>
                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                  {manufacturers.length === 0 ? (
                    <span className="text-sm text-gray-500">Нет данных</span>
                  ) : manufacturers.map((m) => (
                    <label key={m} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={selectedManufacturers.includes(m)}
                        onChange={(e) => {
                          setSelectedManufacturers(prev => e.target.checked ? [...prev, m] : prev.filter(x => x !== m))
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatPrice(priceRange[0])}</span>
                    <span>{formatPrice(priceRange[1])}</span>
                  </div>
                </div>
              </div>

              {/* Reset filters */}
              <button
                onClick={() => {
                  setFilterInStock(false);
                  setPriceRange([0, maxPrice]);
                  setSelectedClass('');
                  setSelectedManufacturers([]);
                }}
                className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                {state.loading ? (
                  <LoadingSpinner 
                    size="large" 
                    text="Загружаем товары категории..." 
                  />
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">Товары не найдены</p>
                    <p className="text-gray-400 mt-2">Попробуйте изменить параметры фильтрации</p>
                  </>
                )}
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {filteredAndSortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;