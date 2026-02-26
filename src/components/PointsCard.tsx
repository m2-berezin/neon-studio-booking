import { usePoints } from '@/hooks/usePoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PointsCard = () => {
  const { pointsBalance, loading } = usePoints();

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl mb-6" />;
  }

  return (
    <Card className="mb-6 border-border/50 bg-card/80">
      <CardContent className="flex flex-col items-center justify-center py-10 px-6">
        <span className="text-4xl mb-3">💎</span>
        <p className="text-5xl font-bold text-foreground mb-2">
          {pointsBalance.toLocaleString()}
        </p>
        <p className="text-lg text-muted-foreground mb-1">
          Pontos acumulados
        </p>
        <p className="text-sm text-muted-foreground text-center">
          Ganha 1500💎 por cada serviço 'Captação 3h Mix & Master' ou 'Mix & Master'
        </p>
      </CardContent>
    </Card>
  );
};

export default PointsCard;
