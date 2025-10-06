import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  phone?: string | null;
  penalty_until?: string | null;
  last_voucher_at?: string | null;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  payment_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  subscriptionDiscountPercent: number;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionDiscountPercent, setSubscriptionDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(false); // Start as false for instant loading

  // Send welcome messages on first login
  const sendWelcomeMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('send-welcome-messages', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error('Error sending welcome messages:', error);
    }
  };

  // Fetch user subscription info (non-blocking)
  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
        setSubscriptionDiscountPercent(0);
        return;
      }

      setSubscription(data);

      // Calculate discount based on subscription age
      if (data) {
        const startDate = new Date(data.start_date);
        const now = new Date();
        const monthsActive = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        // Less than 1 month = 10%, 1 month or more = 15%
        const discount = monthsActive < 1 ? 10 : 15;
        setSubscriptionDiscountPercent(discount);
      } else {
        setSubscriptionDiscountPercent(0);
      }
    } catch (error) {
      console.error('Unexpected error fetching subscription:', error);
      setSubscription(null);
      setSubscriptionDiscountPercent(0);
    }
  };

  // Fetch user profile (non-blocking)
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);

      // Welcome messages functionality removed (column doesn't exist)
      // if (data && !data.welcome_messages_sent) {
      //   setTimeout(() => {
      //     sendWelcomeMessages();
      //   }, 1000);
      // }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id); // Non-blocking
          fetchSubscription(session.user.id); // Non-blocking
        } else {
          setProfile(null);
          setSubscription(null);
          setSubscriptionDiscountPercent(0);
        }
      }
    );

    // Check for existing session (non-blocking)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id); // Non-blocking
          fetchSubscription(session.user.id); // Non-blocking
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setSubscription(null);
        setSubscriptionDiscountPercent(0);
      }
    };

    // Run in background without blocking UI
    checkSession();

    return () => authSubscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        }
      }
    });
    return { error };
  };

  const signIn = async (emailOrPhone: string, password: string) => {
    // Check if it's a phone number (starts with 9 and has 9 digits)
    const isPhoneNumber = /^9\d{8}$/.test(emailOrPhone);
    
    if (isPhoneNumber) {
      // For phone login, we'll need to implement a different approach
      // For now, return an error suggesting email login
      return { error: new Error('Login por telefone será implementado numa atualização futura. Por favor use o email.') };
    } else {
      // Regular email sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrPhone,
        password,
      });
      return { error };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user found') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const value = {
    user,
    session,
    profile,
    subscription,
    subscriptionDiscountPercent,
    loading,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    updateProfile,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};