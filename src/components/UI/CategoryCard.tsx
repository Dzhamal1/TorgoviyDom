import React from 'react';
import { Link } from 'react-router-dom';
import { Category } from '../../types';
import { ArrowRight, Hammer, Zap, Wrench, Droplets, Sofa, Palette, Bolt } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
}

// Маппинг категорий к иконкам и цветам
const getCategoryIcon = (categoryId: string) => {
  const iconMap = {
    stroy: { icon: Hammer, color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    electrical: { icon: Zap, color: 'bg-yellow-500', bgColor: 'bg-yellow-50' },
    tools: { icon: Wrench, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    plumbing: { icon: Droplets, color: 'bg-cyan-500', bgColor: 'bg-cyan-50' },
    furniture: { icon: Sofa, color: 'bg-purple-500', bgColor: 'bg-purple-50' },
    interior: { icon: Palette, color: 'bg-pink-500', bgColor: 'bg-pink-50' },
    fasteners: { icon: Bolt, color: 'bg-gray-500', bgColor: 'bg-gray-50' },
  };
  
  return iconMap[categoryId] || { icon: Hammer, color: 'bg-gray-500', bgColor: 'bg-gray-50' };
};

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  if (!category) {
    return null;
  }

  const { icon: IconComponent, color, bgColor } = getCategoryIcon(category.id);

  return (
    <Link
      to={`/category/${category.id}`}
      className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
    >
      <div className="relative h-56">
        {/* Цветной фон вместо изображения */}
        <div className={`w-full h-full ${bgColor} flex items-center justify-center relative`}>
          {/* Большая иконка категории */}
          <div className={`${color} text-white p-6 rounded-full shadow-lg`}>
            <IconComponent size={48} />
          </div>
          
          {/* Декоративные элементы */}
          <div className="absolute top-4 right-4 opacity-20">
            <IconComponent size={32} className="text-gray-400" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-10">
            <IconComponent size={24} className="text-gray-400" />
          </div>
        </div>
        
        {/* Градиент overlay для текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Контент карточки */}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
          <p className="text-sm text-gray-100 leading-relaxed">{category.description}</p>
        </div>
        
        {/* Стрелка при наведении */}
        <div className="absolute top-6 right-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <ArrowRight size={20} />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;