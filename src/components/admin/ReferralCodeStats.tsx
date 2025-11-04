import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Users, Gift, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferralCodeStat {
  user_id: string;
  full_name: string;
  code: string;
  times_used: number;
  active_rewards: number;
  points_balance: number;
}

const ReferralCodeStats = () => {
  const [stats, setStats] = useState<ReferralCodeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [givingPoints, setGivingPoints] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();

    // Set up realtime subscription
    const channel = supabase
      .channel('referral-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_codes',
        },
        () => {
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_rewards',
        },
        () => {
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_transactions',
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get all referral codes with user info
      const { data: codes, error: codesError } = await supabase
        .from('referral_codes')
        .select(`
          user_id,
          code,
          times_used
        `)
        .order('times_used', { ascending: false });

      if (codesError) throw codesError;

      // Get profile info for each user
      const userIds = codes?.map(c => c.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get active rewards count for each user
      const { data: rewards, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select('user_id')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      if (rewardsError) throw rewardsError;

      // Combine data
      const statsData: ReferralCodeStat[] = codes?.map(code => {
        const profile = profiles?.find(p => p.id === code.user_id);
        const activeRewardsCount = rewards?.filter(r => r.user_id === code.user_id).length || 0;

        return {
          user_id: code.user_id,
          full_name: profile?.full_name || 'Unknown',
          code: code.code,
          times_used: code.times_used || 0,
          active_rewards: activeRewardsCount,
          points_balance: profile?.points_balance || 0,
        };
      }) || [];

      setStats(statsData);
    } catch (error) {
      console.error('Error loading referral code stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGivePoints = async (points: number) => {
    if (!selectedUser) return;
    
    try {
      setGivingPoints(true);

      // Insert point transaction
      const { error } = await supabase
        .from('point_transactions')
        .insert({
          user_id: selectedUser.id,
          amount: points,
          transaction_type: 'admin_gift',
          notes: `Presente do administrador: ${points}💎`,
        });

      if (error) throw error;

      toast({
        title: 'Pontos oferecidos!',
        description: `${points}💎 oferecidos a ${selectedUser.name}`,
      });

      setSelectedUser(null);
    } catch (error) {
      console.error('Error giving points:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível oferecer os pontos',
        variant: 'destructive',
      });
    } finally {
      setGivingPoints(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estatísticas de Códigos de Convite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Estatísticas de Códigos de Convite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de códigos ainda.</p>
        ) : (
          <div className="space-y-3">
            {stats.map((stat) => (
              <div
                key={stat.user_id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedUser({ id: stat.user_id, name: stat.full_name })}
                  >
                    🎁
                  </Button>
                  <div className="space-y-1">
                    <p className="font-medium">{stat.full_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{stat.code}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm items-center">
                  <div className="flex items-center gap-1 font-medium text-primary">
                    <span>{stat.points_balance}💎</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{stat.times_used}</span>
                    <span className="text-muted-foreground">usos</span>
                  </div>
                  {stat.active_rewards > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Gift className="h-4 w-4" />
                      <span className="font-medium">{stat.active_rewards}</span>
                      <span>descontos ativos</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Como Funciona</p>
              <p className="text-sm text-muted-foreground">
                Quando um amigo usa o código e tem a reserva aprovada, o dono do código recebe 25% de desconto válido por 30 dias.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Dialog for giving points */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Oferecer Pontos a {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione quantos pontos deseja oferecer:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[250, 500, 1000, 1500, 2500].map((points) => (
                <Button
                  key={points}
                  variant="outline"
                  className="h-16 text-lg font-semibold"
                  onClick={() => handleGivePoints(points)}
                  disabled={givingPoints}
                >
                  {points}💎
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ReferralCodeStats;
