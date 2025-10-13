import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Gift, Clock } from 'lucide-react';

interface ReferralCodeStat {
  user_id: string;
  full_name: string;
  code: string;
  times_used: number;
  active_rewards: number;
}

const ReferralCodeStats = () => {
  const [stats, setStats] = useState<ReferralCodeStat[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select('id, full_name')
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
        };
      }) || [];

      setStats(statsData);
    } catch (error) {
      console.error('Error loading referral code stats:', error);
    } finally {
      setLoading(false);
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
                <div className="space-y-1">
                  <p className="font-medium">{stat.full_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{stat.code}</p>
                </div>
                <div className="flex gap-4 text-sm">
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
    </Card>
  );
};

export default ReferralCodeStats;
