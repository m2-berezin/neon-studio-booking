import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFriendCode } from '@/hooks/useFriendCode';
import { useAuth } from '@/contexts/AuthContext';

export const FriendCodeDialog = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { applyFriendCode, loading, appliedFriendCode } = useFriendCode();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [hasChecked, setHasChecked] = useState(false);

  // Don't show dialog in admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Only check once per component mount
    if (user && !hasChecked && !isAdminRoute) {
      setHasChecked(true);
      
      const dialogShown = localStorage.getItem(`friend_code_dialog_shown_${user.id}`);
      console.log('[FRIEND CODE DIALOG] Checking for user:', user.id);
      console.log('[FRIEND CODE DIALOG] Dialog shown before:', dialogShown);
      console.log('[FRIEND CODE DIALOG] Applied code:', appliedFriendCode);
      
      // Only show if:
      // 1. Never shown before in localStorage
      // 2. User hasn't applied a code yet
      // 3. Not in admin route
      if (!dialogShown && !appliedFriendCode) {
        console.log('[FRIEND CODE DIALOG] Showing dialog and marking as shown');
        setOpen(true);
        localStorage.setItem(`friend_code_dialog_shown_${user.id}`, 'true');
      } else {
        console.log('[FRIEND CODE DIALOG] Not showing dialog');
      }
    }
  }, [user, hasChecked, appliedFriendCode, isAdminRoute]);

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
            Insere aqui e ganha 💎 2500 pontos (10€ de desconto)!
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            type="text"
            placeholder="CÓDIGO DE AMIGO"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
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
