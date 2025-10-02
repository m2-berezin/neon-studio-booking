import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

interface BlackoutDate {
  id: string;
  date: string;
  reason: string | null;
}

interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null };
  services: { name: string; base_price: number };
}

interface Client {
  id: string;
  full_name: string | null;
  phone: string | null;
  penalty_until: string | null;
  last_voucher_at: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  type: string;
  base_price: number;
  description: string | null;
  is_active: boolean;
}

interface RewardSummary {
  client_id: string;
  full_name: string | null;
  reward_code: string;
  total_count: number;
}

export const useAdmin = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Availability Rules
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState({
    status: '',
    date_from: '',
    date_to: '',
  });

  // Clients
  const [clients, setClients] = useState<Client[]>([]);

  // Services
  const [services, setServices] = useState<Service[]>([]);

  // Rewards
  const [rewardsSummary, setRewardsSummary] = useState<RewardSummary[]>([]);

  // Load availability rules
  const loadAvailabilityRules = async () => {
    try {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setAvailabilityRules(data || []);
    } catch (error) {
      console.error('Error loading availability rules:', error);
    }
  };

  // Load blackout dates
  const loadBlackoutDates = async () => {
    try {
      const { data, error } = await supabase
        .from('blackout_dates')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setBlackoutDates(data || []);
    } catch (error) {
      console.error('Error loading blackout dates:', error);
    }
  };

  // Load bookings with filters
  const loadBookings = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          profiles:client_id(full_name, phone),
          services:service_id(name, base_price)
        `)
        .order('date', { ascending: false });

      if (bookingFilter.status) {
        query = query.eq('status', bookingFilter.status);
      }
      if (bookingFilter.date_from) {
        query = query.gte('date', bookingFilter.date_from);
      }
      if (bookingFilter.date_to) {
        query = query.lte('date', bookingFilter.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  // Load clients
  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Load services
  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  // Load rewards summary
  const loadRewardsSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards_usage')
        .select(`
          client_id,
          reward_code,
          count,
          profiles:client_id(full_name)
        `);

      if (error) throw error;

      // Aggregate by client and reward code
      const summary: Record<string, RewardSummary> = {};
      
      data?.forEach(item => {
        const key = `${item.client_id}-${item.reward_code}`;
        if (!summary[key]) {
          summary[key] = {
            client_id: item.client_id,
            full_name: (item.profiles as any)?.full_name || null,
            reward_code: item.reward_code,
            total_count: 0,
          };
        }
        summary[key].total_count += item.count || 0;
      });

      setRewardsSummary(Object.values(summary));
    } catch (error) {
      console.error('Error loading rewards summary:', error);
    }
  };

  // CRUD Operations

  // Availability Rules
  const createAvailabilityRule = async (rule: Omit<AvailabilityRule, 'id'>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('availability_rules')
        .insert(rule);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Availability rule created successfully',
      });

      loadAvailabilityRules();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create availability rule',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAvailabilityRule = async (id: string, updates: Partial<AvailabilityRule>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('availability_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Availability rule updated successfully',
      });

      loadAvailabilityRules();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update availability rule',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteAvailabilityRule = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Availability rule deleted successfully',
      });

      loadAvailabilityRules();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete availability rule',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Blackout Dates
  const createBlackoutDate = async (blackoutDate: Omit<BlackoutDate, 'id'>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blackout_dates')
        .insert(blackoutDate);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blackout date created successfully',
      });

      loadBlackoutDates();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create blackout date',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteBlackoutDate = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blackout_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blackout date deleted successfully',
      });

      loadBlackoutDates();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete blackout date',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Bookings
  const updateBookingStatus = async (id: string, status: string) => {
    setLoading(true);
    try {
      // First, get the booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, client_id, status')
        .eq('id', id)
        .single();

      if (bookingError) throw bookingError;

      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // If status is 'no_show', apply penalty to client
      if (status === 'no_show') {
        const penaltyUntil = format(addMonths(new Date(), 3), 'yyyy-MM-dd');
        
        const { error: penaltyError } = await supabase
          .from('profiles')
          .update({ penalty_until: penaltyUntil })
          .eq('id', booking.client_id);

        if (penaltyError) throw penaltyError;

        // Create notification for the client about the penalty
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.client_id,
            title: 'Session Penalty Applied',
            body: `A penalty has been applied to your account due to a no-show. Rewards are paused until ${format(addMonths(new Date(), 3), 'MMMM do, yyyy')}.`,
          });

        toast({
          title: 'Status Updated',
          description: `Booking marked as no-show. 3-month penalty applied to client.`,
        });
      } else {
        toast({
          title: 'Success',
          description: 'Booking status updated successfully',
        });
      }

      loadBookings();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking status',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Services
  const createService = async (service: Omit<Service, 'id'>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('services')
        .insert(service);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service created successfully',
      });

      loadServices();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service updated successfully',
      });

      loadServices();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update service',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service deactivated successfully',
      });

      loadServices();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate service',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Issue manual voucher
  const issueVoucher = async (clientId: string, amount: number, expiryDays: number = 60) => {
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { error } = await supabase
        .from('vouchers')
        .insert({
          client_id: clientId,
          code: `ADMIN_${Date.now()}`,
          amount,
          expires_at: expiresAt.toISOString().split('T')[0],
          combinable: false,
          redeemed: false
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `€${amount} voucher issued successfully`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue voucher',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Broadcast message
  const broadcastMessage = async (clientIds: string[], title: string, body: string) => {
    setLoading(true);
    try {
      // Create notifications
      const notifications = clientIds.map(clientId => ({
        user_id: clientId,
        title,
        body,
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Create messages
      const messages = clientIds.map(clientId => ({
        sender_id: user!.id,
        receiver_id: clientId,
        thread_id: crypto.randomUUID(),
        message: `${title}\n\n${body}`,
        timestamp: new Date().toISOString(),
      }));

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messages);

      if (messageError) throw messageError;

      toast({
        title: 'Success',
        description: `Message sent to ${clientIds.length} client(s)`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to broadcast message',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load all data on mount if user is admin
  useEffect(() => {
    if (user && isAdmin()) {
      loadAvailabilityRules();
      loadBlackoutDates();
      loadBookings();
      loadClients();
      loadServices();
      loadRewardsSummary();
    }
  }, [user, isAdmin]);

  // Reload bookings when filter changes
  useEffect(() => {
    if (user && isAdmin()) {
      loadBookings();
    }
  }, [bookingFilter, user, isAdmin]);

  return {
    loading,
    
    // Availability
    availabilityRules,
    blackoutDates,
    createAvailabilityRule,
    updateAvailabilityRule,
    deleteAvailabilityRule,
    createBlackoutDate,
    deleteBlackoutDate,
    
    // Bookings
    bookings,
    bookingFilter,
    setBookingFilter,
    updateBookingStatus,
    
    // Clients
    clients,
    issueVoucher,
    
    // Services
    services,
    createService,
    updateService,
    deleteService,
    
    // Rewards
    rewardsSummary,
    
    // Broadcast
    broadcastMessage,
    
    // Refresh functions
    loadAvailabilityRules,
    loadBlackoutDates,
    loadBookings,
    loadClients,
    loadServices,
    loadRewardsSummary,
  };
};