import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ProductCard from '../components/UI/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular');
  const [selectedClass, setSelectedClass] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);

  const categories = ['Стройматериалы', 'Электрика', 'Инструменты', 'Сантехника', 'Мебель', 'Интерьер', 'Крепежи'];
  // Подтягиваем фильтры (производители/класс) из Google Sheets через edge function filters — уже подключено в useEffect

  const filteredProducts = useMemo(() => {
    if (!state.products || state.products.length === 0) {
      return [];
    }
    
    let filtered = state.products.filter(product => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDescription = product.description.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription && !matchesCategory) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory && product.category !== selectedCategory) {
        return false;
      }
      // Class filter
      if (selectedClass && (product.class || '') !== selectedClass) {
        return false;
      }
      // Manufacturers filter
      if (selectedManufacturers.length > 0 && (!product.manufacturer || !selectedManufacturers.includes(product.manufacturer))) {
        return false;
      }

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
  }, [state.products, searchQuery, selectedCategory, selectedClass, selectedManufacturers, sortBy]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  // Загружаем списки фильтров с сервера (Edge Function filters) с резервом на клиенте
  useEffect(() => {
    (async () => {
      try {
        const { api } = await import('../services/api')
        const params: any = {}
        if (selectedCategory) params.category = selectedCategory
        if (selectedClass) params.class = selectedClass
        const data = await api.getFilters(params)
        let cls = Array.from(new Set((data.classes || []).map(x => (x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        let mans = Array.from(new Set((data.manufacturers || []).map(x => (x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))

        // Резерв: считаем на клиенте, если сервер ничего не вернул
        if (cls.length === 0 || mans.length === 0) {
          let base = state.products || []
          if (selectedCategory) base = base.filter(p => p.category === selectedCategory)
          cls = Array.from(new Set(base.map(p => (p.class || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))

          let base2 = base
          if (selectedClass) base2 = base2.filter(p => (p.class || '') === selectedClass)
          mans = Array.from(new Set(base2.map(p => (p.manufacturer || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        }

        setClasses(cls)
        setManufacturers(mans)
        setSelectedManufacturers(prev => prev.filter(m => mans.includes(m)))
      } catch {
        // Резерв при ошибке
        let base = state.products || []
        if (selectedCategory) base = base.filter(p => p.category === selectedCategory)
        const cls = Array.from(new Set(base.map(p => (p.class || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        let base2 = base
        if (selectedClass) base2 = base2.filter(p => (p.class || '') === selectedClass)
        const mans = Array.from(new Set(base2.map(p => (p.manufacturer || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
        setClasses(cls)
        setManufacturers(mans)
        setSelectedManufacturers(prev => prev.filter(m => mans.includes(m)))
      }
    })()
  }, [selectedCategory, selectedClass, state.products])

  // При прямом заходе — загрузим товары
  useEffect(() => {
    const load = async () => {
      if (state.products && state.products.length > 0) return;
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const { api } = await import('../services/api');
        const products = await api.getProducts();
        dispatch({ type: 'SET_PRODUCTS', payload: products });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    load();
  }, [dispatch, state.products]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: `Поиск${searchQuery ? `: "${searchQuery}"` : ''}` },
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Поиск товаров
          </h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, описанию или категории..."
                className="w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-6 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Results Count */}
          <p className="text-gray-600">
            {searchQuery && (
              <>Результаты поиска "{searchQuery}": </>
            )}
            найдено товаров: {filteredProducts.length}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64">
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Filter size={20} className="mr-2" />
                Фильтры
              </h3>

              {/* Category filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все категории</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Класс
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все классы</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Manufacturers checkboxes */}
              <div className="mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-2">Производители</span>
                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                  {manufacturers.length === 0 ? (
                    <span className="text-sm text-gray-500">Нет данных</span>
                  ) : manufacturers.map(m => (
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

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="popular">По популярности</option>
                  <option value="name">По названию</option>
                  <option value="price">По цене</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                {state.loading ? (
                  <LoadingSpinner 
                    size="large" 
                    text="Ищем товары..." 
                  />
                ) : (
                  <>
                    <Search size={64} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Ничего не найдено</h2>
                    <p className="text-gray-600 mb-4">
                      {searchQuery 
                        ? `По запросу "${searchQuery}" товары не найдены`
                        : 'Попробуйте изменить параметры поиска'
                      }
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('');
                        setSearchParams({});
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Сбросить все фильтры
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
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

export default SearchPage;