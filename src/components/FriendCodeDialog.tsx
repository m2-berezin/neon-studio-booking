import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFriendCode } from '@/hooks/useFriendCode';
import { useAuth } from '@/contexts/AuthContext';

export const FriendCodeDialog = () => {
  const { user } = useAuth();
  const { applyFriendCode, loading, appliedFriendCode } = useFriendCode();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [hasSeenDialog, setHasSeenDialog] = useState(false);

  useEffect(() => {
    // Check if user is new and hasn't seen the dialog yet
    if (user && !appliedFriendCode && !hasSeenDialog) {
      const dialogShown = localStorage.getItem(`friend_code_dialog_shown_${user.id}`);
      if (!dialogShown) {
        setOpen(true);
        setHasSeenDialog(true);
      }
    }
  }, [user, appliedFriendCode, hasSeenDialog]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`friend_code_dialog_shown_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const success = await applyFriendCode(code);
    if (success) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Tens um código de amigo?</DialogTitle>
          <DialogDescription className="text-center">
            Insere aqui e ganha 2500 pontos (10€ de desconto)!
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            type="text"
            placeholder="CÓDIGO DE AMIGO"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={20}
            className="text-center text-lg font-semibold tracking-wider"
            disabled={loading}
          />
          
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading ? 'A aplicar...' : 'Aplicar Código'}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
              disabled={loading}
            >
              Inserir mais tarde
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
