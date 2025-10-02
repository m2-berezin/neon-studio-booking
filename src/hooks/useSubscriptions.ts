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
      // Find admin user
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      if (adminError) throw adminError;

      if (adminUser) {
        // Send admin notification
        await supabase
          .from('notifications')
          .insert({
            user_id: adminUser.id,
            title: 'Monthly Schedule Request',
            body: `${user.email} has requested their monthly schedule for ${userSubscription.plan}.`,
          });

        // Create message thread
        await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: adminUser.id,
            thread_id: crypto.randomUUID(),
            message: `Hi! I'd like to request my monthly schedule for my ${userSubscription.plan} subscription. Please let me know the available slots based on my preferences.`,
            timestamp: new Date().toISOString(),
          });
      }

      toast({
        title: 'Schedule Requested',
        description: 'Your monthly schedule request has been sent to the admin team.',
      });

      return true;
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