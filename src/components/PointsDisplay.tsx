import { useState } from 'react';
import { usePoints } from '@/hooks/usePoints';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export const PointsDisplay = () => {
  const { pointsBalance, loading } = usePoints();
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  if (loading) {
    return <Skeleton className="h-9 w-20" />;
  }

  return (
    <>
      <button 
        onClick={() => setShowInfoDialog(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <span className="text-base leading-none">💎</span>
        <span className="text-xs font-semibold text-primary leading-none">
          {pointsBalance.toLocaleString()}
        </span>
      </button>

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Como ganhar 💎</DialogTitle>
            <DialogDescription className="text-center text-base pt-4">
              Ganha 💎 a convidar amigos para a app, por cada amigo ganhas 2500💎 que equivale a 10€ de desconto em reservas/serviços!
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
