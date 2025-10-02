import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  plan: string;
  hours_per_month: number;
  price: number;
  discounted_price: number;
  start_date: string;
  active: boolean;
}

interface SubscriptionPreferences {
  preferred_days: string[];
  preferred_time_windows: { start: string; end: string }[];
}

interface SuggestedSlot {
  date: Date;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
}

export const useSubscriptions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<SubscriptionPlan | null>(null);
  const [preferences, setPreferences] = useState<SubscriptionPreferences>({
    preferred_days: [],
    preferred_time_windows: []
  });
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);

  // Load user's current subscription
  const loadUserSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', user.id)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      setUserSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  // Load subscription preferences
  const loadPreferences = async () => {
    if (!user || !userSubscription) return;

    try {
      const { data, error } = await supabase
        .from('subscription_preferences')
        .select('*')
        .eq('subscription_id', userSubscription.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPreferences({
          preferred_days: data.preferred_days || [],
          preferred_time_windows: (data.preferred_time_windows as any) || []
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Save subscription preferences
  const savePreferences = async (newPreferences: SubscriptionPreferences) => {
    if (!user || !userSubscription) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_preferences')
        .upsert({
          subscription_id: userSubscription.id,
          preferred_days: newPreferences.preferred_days,
          preferred_time_windows: newPreferences.preferred_time_windows as any
        });

      if (error) throw error;

      setPreferences(newPreferences);
      generateSuggestedSlots(newPreferences);
      
      toast({
        title: 'Preferences Saved',
        description: 'Your subscription preferences have been updated.',
      });

      return true;
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Generate suggested slots based on preferences
  const generateSuggestedSlots = (prefs: SubscriptionPreferences) => {
    if (!prefs.preferred_days.length || !prefs.preferred_time_windows.length) {
      setSuggestedSlots([]);
      return;
    }

    const slots: SuggestedSlot[] = [];
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Generate slots for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      prefs.preferred_days.forEach(dayOfWeekStr => {
        const dayOfWeek = parseInt(dayOfWeekStr);
        const targetDate = new Date(today);
        const daysUntilTarget = (dayOfWeek - today.getDay() + 7) % 7;
        targetDate.setDate(today.getDate() + daysUntilTarget + (week * 7));
        
        // Skip past dates
        if (targetDate < today) return;

        prefs.preferred_time_windows.forEach(timeWindow => {
          slots.push({
            date: targetDate,
            startTime: timeWindow.start,
            endTime: timeWindow.end,
            dayOfWeek: daysOfWeek[dayOfWeek]
          });
        });
      });
    }

    // Sort by date and take first 4
    slots.sort((a, b) => a.date.getTime() - b.date.getTime());
    setSuggestedSlots(slots.slice(0, 4));
  };

  // Create subscription
  const createSubscription = async (plan: string, hoursPerMonth: number, price: number, discountedPrice: number) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          client_id: user.id,
          plan,
          hours_per_month: hoursPerMonth,
          price,
          discounted_price: discountedPrice,
          start_date: new Date().toISOString().split('T')[0],
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      setUserSubscription(data);
      
      toast({
        title: 'Subscription Created',
        description: `${plan} subscription activated successfully!`,
      });

      return true;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Request monthly schedule
  const requestMonthlySchedule = async () => {
    if (!user || !userSubscription) return false;

    setLoading(true);
    try {
      // Find ALL admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      if (adminUsers && adminUsers.length > 0) {
        console.log(`📤 Enviando pedido de horário para ${adminUsers.length} admin(s):`, adminUsers.map(a => a.full_name));
        
        // Send notifications to ALL admins
        const notifications = adminUsers.map(admin => ({
          user_id: admin.id,
          title: 'Pedido de Horário Mensal',
          body: `${user.email} pediu o horário mensal para ${userSubscription.plan}.`,
        }));
        
        await supabase
          .from('notifications')
          .insert(notifications);

        // Create message thread with each admin
        for (const admin of adminUsers) {
          await supabase
            .from('messages')
            .insert({
              sender_id: user.id,
              recipient_id: admin.id,
              thread_type: 'subscription_schedule',
              body: `Olá! Gostaria de pedir o meu horário mensal para a minha subscrição ${userSubscription.plan}. Por favor, informa-me dos horários disponíveis baseado nas minhas preferências.`,
            });
        }

        toast({
          title: 'Horário Pedido',
          description: 'O teu pedido de horário mensal foi enviado para a equipa admin.',
        });

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Error requesting schedule:', error);
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to request monthly schedule',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (userSubscription) {
      loadPreferences();
    }
  }, [userSubscription]);

  useEffect(() => {
    if (preferences.preferred_days.length && preferences.preferred_time_windows.length) {
      generateSuggestedSlots(preferences);
    }
  }, [preferences]);

  return {
    loading,
    userSubscription,
    preferences,
    suggestedSlots,
    savePreferences,
    createSubscription,
    requestMonthlySchedule,
  };
};