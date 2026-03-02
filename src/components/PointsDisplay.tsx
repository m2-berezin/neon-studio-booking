import { useState } from 'react';
import { usePoints } from '@/hooks/usePoints';
import { useFriendCode } from '@/hooks/useFriendCode';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

export const PointsDisplay = () => {
  const { pointsBalance, loading } = usePoints();
  const { myFriendCode } = useFriendCode();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!myFriendCode) return;
    
    try {
      await navigator.clipboard.writeText(myFriendCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "O teu código de amigo foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

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
              Ganha 💎 a convidar amigos para a app, por cada amigo ganhas 5000💎 que equivale a 10€ de desconto em reservas/serviços!
            </DialogDescription>
          </DialogHeader>
          
          {user && profile && myFriendCode && (
            <div className="space-y-3 mt-4">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-2">
                  Teu código de convite
                </p>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={myFriendCode}
                  readOnly
                  className="text-center text-sm font-bold tracking-wide"
                />
                <Button
                  onClick={handleCopyCode}
                  size="icon"
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
