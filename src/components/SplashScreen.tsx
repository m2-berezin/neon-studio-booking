import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 1700); // 1.7 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-2">7T7</h1>
          <p className="text-xl text-muted-foreground">Studios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">7T7</h1>
        <p className="text-xl text-muted-foreground">Studios</p>
      </div>
    </div>
  );
};

export default SplashScreen;