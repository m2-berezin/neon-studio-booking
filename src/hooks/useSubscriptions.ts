import { useState } from 'react';
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

  // Subscriptions tables don't exist - all functions disabled
  const loadUserSubscription = async () => {
    setUserSubscription(null);
  };

  const loadPreferences = async () => {
    setPreferences({
      preferred_days: [],
      preferred_time_windows: []
    });
  };

  const savePreferences = async (newPreferences: SubscriptionPreferences) => {
    toast({
      title: 'Error',
      description: 'Subscriptions system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const generateSuggestedSlots = (prefs: SubscriptionPreferences) => {
    setSuggestedSlots([]);
  };

  const createSubscription = async (plan: string, hoursPerMonth: number, price: number, discountedPrice: number) => {
    toast({
      title: 'Error',
      description: 'Subscriptions system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const requestMonthlySchedule = async () => {
    toast({
      title: 'Error',
      description: 'Subscriptions system not implemented',
      variant: 'destructive',
    });
    return false;
  };

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
