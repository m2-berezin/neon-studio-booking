import { useState } from 'react';
import { usePoints } from '@/hooks/usePoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PointsCard = () => {
  const { pointsBalance, loading } = usePoints();
  const [showDialog, setShowDialog] = useState(false);

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-xl mb-4" />;
  }

  return (
    <>
      <Card 
        className="mb-4 border-border/50 bg-card/80 cursor-pointer hover:bg-card/90 transition-colors"
        onClick={() => setShowDialog(true)}
      >
        <CardContent className="flex flex-col items-center justify-center py-6 px-4">
          <span className="text-2xl mb-2">💎</span>
          <p className="text-3xl font-bold text-foreground mb-1">
            {pointsBalance.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mb-0.5">
            Pontos acumulados
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Clica para saber como ganhar 💎
          </p>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">Como ganhar 💎</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground text-center">
                Convida amigos para a app! Por cada amigo ganhas <span className="font-semibold">2500💎</span>
              </p>
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground text-center">
                Por cada serviço <span className="font-semibold">'Captação 3h Mix & Master'</span> ou <span className="font-semibold">'Mix & Master'</span> ganhas <span className="font-semibold">1500💎</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PointsCard;
