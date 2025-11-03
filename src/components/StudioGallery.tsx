import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import studio2 from '@/assets/studio-2.jpg';
import studio3 from '@/assets/studio-3.jpg';
import studio4 from '@/assets/studio-4.jpg';
import studio5 from '@/assets/studio-5.jpg';

const StudioGallery = () => {
  const images = [studio2, studio3, studio4, studio5];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
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

  const handleImageClick = () => {
    setIsZoomOpen(true);
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleCloseZoom = () => {
    setIsZoomOpen(false);
    setZoomLevel(1);
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
        className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-muted touch-pan-y cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleImageClick}
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

      {/* Zoom Dialog */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0">
          <div className="relative w-full h-full flex items-center justify-center bg-black/95">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={handleCloseZoom}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </div>

            {/* Zoomable image */}
            <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
              <img
                src={images[currentIndex]}
                alt={`Vista do estúdio ${currentIndex + 1}`}
                className="transition-transform duration-200 max-w-none"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudioGallery;
