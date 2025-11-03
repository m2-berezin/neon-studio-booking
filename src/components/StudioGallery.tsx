import React, { useState, useEffect, useRef } from 'react';
import studio2 from '@/assets/studio-2.jpg';
import studio3 from '@/assets/studio-3.jpg';
import studio4 from '@/assets/studio-4.jpg';
import studio5 from '@/assets/studio-5.jpg';

const StudioGallery = () => {
  const images = [studio2, studio3, studio4, studio5];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play effect
  useEffect(() => {
    if (!autoPlayEnabled) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setIsTransitioning(false);
      }, 300);
    }, 2700);

    return () => clearInterval(interval);
  }, [images.length, autoPlayEnabled]);

  // Reset auto-play timer
  const resetAutoPlayTimer = () => {
    setAutoPlayEnabled(false);
    
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    
    autoPlayTimeoutRef.current = setTimeout(() => {
      setAutoPlayEnabled(true);
    }, 7000);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next image
        goToNext();
      } else {
        // Swipe right - previous image
        goToPrevious();
      }
      resetAutoPlayTimer();
    }
  };

  const goToNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      setIsTransitioning(false);
    }, 300);
  };

  const goToPrevious = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    resetAutoPlayTimer();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mt-4">
      <div 
        className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-muted touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Vista do estúdio ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
              index === currentIndex && !isTransitioning
                ? 'translate-x-0 opacity-100'
                : index === currentIndex && isTransitioning
                ? '-translate-x-full opacity-0'
                : 'translate-x-full opacity-0'
            }`}
            style={{
              transitionTimingFunction: 'ease-in-out'
            }}
          />
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'w-6 bg-primary' 
                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Ver foto ${index + 1}`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        O estúdio dispõe de Ar Condicionado.
      </p>
    </div>
  );
};

export default StudioGallery;
