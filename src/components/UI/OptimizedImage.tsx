import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  placeholder?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  sizes,
  onError,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzOEZGIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNDAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTcwIDEzMEgxODBWMTcwSDE3MFYxMzBaTTIyMCAxMzBIMjMwVjE3MEgyMjBWMTMwWiIgZmlsbD0id2hpdGUiLz4KPHN2ZyB4PSIxNzUiIHk9IjEzNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIj4KPHA+CjxwYXRoIGQ9Ik0xMCAxNUwyNSA1TDQwIDE1TDI1IDI1TDEwIDE1WiIgZmlsbD0id2hpdGUiLz4KPC9wPgo8L3N2Zz4KPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIGZvbnQtd2VpZ2h0PSI1MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCi0L7QstCw0YA8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+0J7RgtGB0YPRgtGB0YLQstGD0LXRgiDQuNC30L7QsdGA0LDQttC10L3QuNC1PC90ZXh0Pgo8L3N2Zz4='
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Предзагрузка изображения
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
      setCurrentSrc(placeholder);
    };
    img.src = src;
  }, [src, placeholder]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(placeholder);
      if (onError) {
        onError(e);
      }
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Прелоадер */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 image-loading rounded-lg" />
      )}
      
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        loading={loading}
        decoding="async"
        sizes={sizes}
        onError={handleError}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default OptimizedImage;