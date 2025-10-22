import { Award } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { Skeleton } from '@/components/ui/skeleton';

export const PointsDisplay = () => {
  const { pointsBalance, loading } = usePoints();

  if (loading) {
    return <Skeleton className="h-9 w-20" />;
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
      <Award className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-primary">
        {pointsBalance.toLocaleString()}
      </span>
    </div>
  );
};
