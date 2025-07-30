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
  placeholder = 'https://images.pexels.com/photos/1198802/pexels-photo-1198802.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'
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