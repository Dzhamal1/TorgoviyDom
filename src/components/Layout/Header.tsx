import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, Phone, User, LogOut, Settings, ChevronDown } from 'lucide-react';
// import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import AuthModal from '../Auth/AuthModal';
import UserProfile from '../UserProfile/UserProfile'; // Assuming UserProfile component is added

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // State for profile modal
  const [searchQuery, setSearchQuery] = useState('');
  // const { state } = useApp();
  const { user, profile, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setUserMenuOpen(false);
      // Хард-редирект для гарантии сброса стейта роутера
      navigate('/', { replace: true });
    }
  };

  const categories = [
    { id: 'stroy', name: 'Стройматериалы' },
    { id: 'electrical', name: 'Электрика' },
    { id: 'tools', name: 'Инструменты' },
    { id: 'plumbing', name: 'Сантехника' },
    { id: 'furniture', name: 'Мебель' },
    { id: 'interior', name: 'Интерьер' },
    { id: 'fasteners', name: 'Крепежи' },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top contact bar */}
      <div className="bg-blue-600 text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <a href="tel:+79001234567" className="flex items-center space-x-1 hover:text-blue-200">
              <Phone size={14} />
              <span>+7 (900) 123-45-67</span>
            </a>
          </div>
          <span>Пн-Пт: 9:00-18:00</span>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <span className="text-xl font-bold">ТД</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Торговый дом</h1>
              <p className="text-sm text-gray-600">Все для стройки</p>
            </div>
          </Link>

          {/* Search bar - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск товаров..."
                className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Cart and menu */}
          <div className="flex items-center space-x-4">
            {/* Auth section */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-base font-medium">
                    {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-medium text-sm leading-tight">{profile?.full_name || 'Пользователь'}</p>
                  </div>
                  <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
                      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-base font-medium">
                            {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {profile?.full_name || 'Пользователь'}
                            </p>
                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                            {profile?.phone && (
                              <p className="text-sm text-gray-500">{profile.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <button
                          onClick={() => setIsProfileModalOpen(true)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 transition-colors"
                        >
                          <Settings size={16} />
                          <span>Настройки профиля</span>
                        </button>

                        <Link
                          to="/orders"
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ShoppingCart size={16} />
                          <span>Мои заказы</span>
                        </Link>

                        <hr className="my-2" />

                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                        >
                          <LogOut size={16} />
                          <span>Выйти из аккаунта</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-gray-50"
              >
                <div className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center">
                  <User size={16} />
                </div>
                <div className="hidden md:block">
                  <p className="font-medium text-sm leading-tight">Войти</p>
                </div>
              </button>
            )}

            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs animate-pulse">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Админская панель (только для админов) */}
            {user?.email?.includes('admin') && (
              <Link to="/admin" className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Админская панель">
                <Settings size={24} />
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск товаров..."
              className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-full px-4 bg-blue-600 text-white rounded-r-lg"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden md:block bg-gray-50 border-t">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex-1 text-center py-2 px-2 rounded hover:bg-blue-50"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <nav className="md:hidden bg-white border-t shadow-lg">
          <div className="container mx-auto px-4 py-4">
            {/* Mobile user info */}
            {user && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                    {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{profile?.full_name || 'Пользователь'}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {profile?.phone && (
                      <p className="text-sm text-gray-500">{profile.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex-1 text-center py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    Профиль
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 text-center py-2 px-3 bg-red-600 text-white rounded-lg text-sm font-medium"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="block text-gray-700 hover:text-blue-600 font-medium py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfile
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};

export default Header;