import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendCode } from '@/hooks/useFriendCode';
import { RefreshCw, Bug } from 'lucide-react';

/**
 * Debug panel to show current state of user data
 * Only visible in development
 */
export const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, subscription, subscriptionDiscountPercent, refreshUserData } = useAuth();
  const { myFriendCode, appliedFriendCode } = useFriendCode();

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg"
        >
          <Bug className="h-4 w-4" />
        </Button>
      ) : (
        <Card className="w-80 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Panel
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refreshUserData()}
                  title="Refresh data"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              <span className="font-semibold">User ID:</span>
              <p className="text-muted-foreground truncate">{user?.id || 'N/A'}</p>
            </div>

            <div>
              <span className="font-semibold">Profile:</span>
              <p className="text-muted-foreground">{profile?.full_name || 'N/A'}</p>
            </div>

            <div>
              <span className="font-semibold">Subscription:</span>
              {subscription ? (
                <div className="space-y-1">
                  <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                    Plan {subscription.plan_type} ({subscription.payment_status})
                  </Badge>
                  <p className="text-muted-foreground">
                    Discount: {subscriptionDiscountPercent}%
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">None</p>
              )}
            </div>

            <div>
              <span className="font-semibold">Friend Code:</span>
              <div className="space-y-1">
                <p className="text-muted-foreground">My Code: {myFriendCode || 'N/A'}</p>
                <p className="text-muted-foreground">
                  Applied: {appliedFriendCode || 'None'}
                  {appliedFriendCode && <Badge className="ml-2 bg-green-500">25% OFF</Badge>}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground italic">
                ✓ Realtime sync active
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
