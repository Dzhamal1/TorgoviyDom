import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
  showRetry?: boolean;
  onRetry?: () => void;
}

// Оптимизированный компонент спиннера загрузки с поддержкой разных размеров
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Загрузка...', 
  fullScreen = false,
  showRetry = false,
  onRetry
}) => {
  // Конфигурация размеров спиннера
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  // Конфигурация размеров текста
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  // Основной элемент спиннера с анимацией
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* CSS-анимированный спиннер без использования внешних библиотек */}
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      
      {/* Информативный текст состояния загрузки */}
      <p className={`text-gray-600 font-medium ${textSizeClasses[size]}`}>
        {text}
      </p>
      
      {/* Кнопка повторной попытки при сетевых ошибках */}
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Повторить попытку
        </button>
      )}
    </div>
  );

  // Полноэкранный режим с backdrop blur эффектом
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;