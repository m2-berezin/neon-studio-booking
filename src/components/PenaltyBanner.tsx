import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface PenaltyBannerProps {
  penaltyEndDate: Date;
  className?: string;
}

const PenaltyBanner = ({ penaltyEndDate, className = '' }: PenaltyBannerProps) => {
  return (
    <Alert className={`border-destructive bg-destructive/10 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertDescription className="text-destructive font-medium">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span>
            Penalização ativa até {format(penaltyEndDate, 'd MMMM yyyy', { locale: require('date-fns/locale/pt') })}. Recompensas pausadas.
          </span>
        </div>
        <p className="text-sm text-destructive/80 mt-1">
          Esta penalização foi aplicada devido a não comparência. Por favor contacte o estúdio se tiver dúvidas.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default PenaltyBanner;