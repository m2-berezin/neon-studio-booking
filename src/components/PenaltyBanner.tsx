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
            Penalty active until {format(penaltyEndDate, 'MMMM do, yyyy')}. Rewards paused.
          </span>
        </div>
        <p className="text-sm text-destructive/80 mt-1">
          This penalty was applied due to a no-show. Please contact the studio if you have questions.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default PenaltyBanner;