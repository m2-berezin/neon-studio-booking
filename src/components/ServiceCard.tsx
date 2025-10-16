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
      className={`studio-card cursor-pointer tap-target transition-all duration-300 ${
        gradient ? 'bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/15 hover:to-accent/15' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg flex-shrink-0 ${gradient ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Icon 
            size={24} 
            className={gradient ? 'text-primary' : 'text-accent'} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1.5 font-serif">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed font-sans">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;