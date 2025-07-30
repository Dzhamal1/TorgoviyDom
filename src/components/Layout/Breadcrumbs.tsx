import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const location = useLocation();
  
  // Generate breadcrumbs based on current path if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Главная', href: '/' }];

    pathSegments.forEach((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      let label = segment;

      // Map segment to readable label
      if (segment === 'category') {
        label = 'Категории';
      } else if (segment === 'product') {
        label = 'Товар';
      } else if (segment === 'cart') {
        label = 'Корзина';
      } else if (segment === 'search') {
        label = 'Поиск';
      } else {
        // For category IDs and product IDs, we might want to fetch actual names
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      breadcrumbs.push({ label, href });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="bg-gray-50 border-b">
      <div className="container mx-auto px-4 py-3">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <ChevronRight size={16} className="text-gray-400 mx-2" />}
              {index === 0 && <Home size={16} className="text-gray-500 mr-1" />}
              {item.href && index < breadcrumbItems.length - 1 ? (
                <Link
                  to={item.href}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumbs;