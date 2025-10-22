import { Coins } from 'lucide-react';
import { useCoins } from '@/hooks/useCoins';
import { Skeleton } from '@/components/ui/skeleton';

export const CoinsDisplay = () => {
  const { coinsBalance, loading } = useCoins();

  if (loading) {
    return <Skeleton className="h-9 w-20" />;
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
      <Coins className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-primary">
        {coinsBalance.toLocaleString()}
      </span>
    </div>
  );
};
