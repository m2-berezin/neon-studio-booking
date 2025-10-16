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
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${gradient ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Icon 
            size={24} 
            className={gradient ? 'text-primary' : 'text-accent'} 
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <h3 className="text-lg font-bold text-foreground mb-1 font-serif leading-tight">
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