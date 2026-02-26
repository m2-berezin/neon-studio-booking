import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  gradient?: boolean;
}

const ServiceCard = ({ title, description, icon: Icon, onClick, gradient }: ServiceCardProps) => {
  return (
    <div 
      className={`cursor-pointer tap-target transition-all duration-300 bg-card border border-border rounded-xl p-3 ${
        gradient ? 'bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/15 hover:to-accent/15' : ''
      }`}
      onClick={onClick}
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${gradient ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Icon 
            size={20} 
            className={gradient ? 'text-primary' : 'text-accent'} 
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground font-serif leading-tight">
            {title}
          </h3>
          <p className="text-muted-foreground text-xs leading-snug font-sans mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;