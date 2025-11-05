import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className={`font-bold ${sizeClasses[size]} text-white`}
        style={{ 
          fontFamily: 'Georgia, serif',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2)',
          letterSpacing: '0.1em'
        }}
      >
        7T7
      </div>
      <div 
        className={`font-bold ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'} text-white`}
        style={{ 
          fontFamily: 'Georgia, serif',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.15em'
        }}
      >
        Studios
      </div>
    </div>
  );
};

export default Logo;