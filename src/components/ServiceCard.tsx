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
      className={`studio-card cursor-pointer tap-target ${
        gradient ? 'bg-gradient-to-br from-primary/10 to-accent/10' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${gradient ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Icon 
            size={24} 
            className={gradient ? 'text-primary' : 'text-accent'} 
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;