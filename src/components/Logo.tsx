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
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`font-serif font-bold neon-heading ${sizeClasses[size]}`}>
        7T7Studios
      </div>
      <div className="flex flex-col text-xs opacity-70">
        <span className="text-accent">MUSIC</span>
        <span className="text-primary">STUDIO</span>
      </div>
    </div>
  );
};

export default Logo;