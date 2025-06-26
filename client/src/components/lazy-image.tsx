import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  placeholder?: string;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  fallback = '/api/placeholder/150/150',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik03NSA2MC4zMTI1QzY5LjEyNSA2MC4zMTI1IDY0LjM3NSA2NS4wNjI1IDY0LjM3NSA3MC45Mzc1QzY0LjM3NSA3Ni44MTI1IDY5LjEyNSA4MS41NjI1IDc1IDgxLjU2MjVDODAuODc1IDgxLjU2MjUgODUuNjI1IDc2LjgxMjUgODUuNjI1IDcwLjkzNzVDODUuNjI1IDY1LjA2MjUgODAuODc1IDYwLjMxMjUgNzUgNjAuMzEyNVoiIGZpbGw9IiNkMWQ1ZGIiLz4KPHBhdGggZD0iTTUyLjUgOTMuNzVMNjcuNSA3OC43NUw3NSA4Ni4yNUw5MC4zNzUgNzAuMzEyNUwxMTIuNSA5Mi4yNUwxMTIuNSA5OS4zNzVINTIuNVY5My43NVoiIGZpbGw9IiNkMWQ1ZGIiLz4KPC9zdmc+'
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(true);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={!isVisible ? placeholder : isError ? fallback : src}
        alt={alt}
        className={cn(
          'transition-opacity duration-300 ease-in-out',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      {!isLoaded && (
        <div className={cn(
          'absolute inset-0 bg-gray-200 animate-pulse',
          'flex items-center justify-center'
        )}>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}