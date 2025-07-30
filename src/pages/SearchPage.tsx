import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ProductCard from '../components/UI/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular');
  const [filterInStock, setFilterInStock] = useState(false);

  const categories = ['Стройматериалы', 'Электрика', 'Инструменты', 'Сантехника', 'Мебель', 'Интерьер', 'Крепежи'];

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

      // In stock filter
      if (filterInStock && !product.inStock) {
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
          return b.inStock ? 1 : -1; // In stock items first
      }
    });

    return filtered;
  }, [state.products, searchQuery, selectedCategory, filterInStock, sortBy]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

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

              {/* In stock filter */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterInStock}
                    onChange={(e) => setFilterInStock(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">Только в наличии</span>
                </label>
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
                        setFilterInStock(false);
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