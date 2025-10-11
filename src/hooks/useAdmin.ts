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
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_eur: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  image_url: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
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
    // Table not yet implemented
    setAvailabilityRules([]);
    // try {
    //   const { data, error } = await supabase
    //     .from('availability_rules')
    //     .select('*')
    //     .order('day_of_week', { ascending: true });
    //   if (error) throw error;
    //   setAvailabilityRules(data || []);
    // } catch (error) {
    //   console.error('Error loading availability rules:', error);
    // }
  };

  // Load blackout dates
  const loadBlackoutDates = async () => {
    // Table not yet implemented
    setBlackoutDates([]);
    // try {
    //   const { data, error } = await supabase
    //     .from('blackout_dates')
    //     .select('*')
    //     .order('date', { ascending: true });
    //   if (error) throw error;
    //   setBlackoutDates(data || []);
    // } catch (error) {
    //   console.error('Error loading blackout dates:', error);
    // }
  };

  // Load bookings with filters
  const loadBookings = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('hidden_from_admin', false)
        .order('created_at', { ascending: false });
      
      if (bookingFilter.status) {
        query = query.eq('status', bookingFilter.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles and services separately
      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const serviceIds = [...new Set(data?.map(b => b.service_id) || [])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);
      
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, price_eur')
        .in('id', serviceIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const servicesMap = new Map(servicesData?.map(s => [s.id, s]) || []);
      
      // Map to expected format with date/time fields
      const mappedData = (data || []).map(b => ({
        id: b.id,
        client_id: b.user_id,
        service_id: b.service_id,
        date: b.starts_at ? format(new Date(b.starts_at), 'yyyy-MM-dd') : '',
        start_time: b.starts_at ? format(new Date(b.starts_at), 'HH:mm:ss') : '',
        end_time: b.ends_at ? format(new Date(b.ends_at), 'HH:mm:ss') : '',
        status: b.status,
        notes: b.service_name_snapshot || '',
        created_at: b.created_at,
        profiles: {
          full_name: profilesMap.get(b.user_id)?.full_name || null,
          phone: profilesMap.get(b.user_id)?.phone || null
        },
        services: {
          name: servicesMap.get(b.service_id)?.name || b.service_name_snapshot || '',
          base_price: servicesMap.get(b.service_id)?.price_eur || b.price_eur_snapshot || 0
        }
      }));
      
      setBookings(mappedData);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as reservas',
        variant: 'destructive',
      });
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
    // rewards_usage table not implemented
    setRewardsSummary([]);
  };

  // CRUD Operations

  // Availability Rules (table doesn't exist - disabled)
  const createAvailabilityRule = async (rule: Omit<AvailabilityRule, 'id'>) => {
    toast({
      title: 'Error',
      description: 'Availability rules table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const updateAvailabilityRule = async (id: string, updates: Partial<AvailabilityRule>) => {
    toast({
      title: 'Error',
      description: 'Availability rules table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const deleteAvailabilityRule = async (id: string) => {
    toast({
      title: 'Error',
      description: 'Availability rules table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  // Blackout Dates (table doesn't exist - disabled)
  const createBlackoutDate = async (blackoutDate: Omit<BlackoutDate, 'id'>) => {
    toast({
      title: 'Error',
      description: 'Blackout dates table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const deleteBlackoutDate = async (id: string) => {
    toast({
      title: 'Error',
      description: 'Blackout dates table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  // Bookings (table doesn't exist - disabled)
  const updateBookingStatus = async (id: string, status: string) => {
    toast({
      title: 'Error',
      description: 'Bookings table not implemented',
      variant: 'destructive',
    });
    return false;
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

  // Issue manual voucher (table doesn't exist - disabled)
  const issueVoucher = async (clientId: string, amount: number, expiryDays: number = 60) => {
    toast({
      title: 'Error',
      description: 'Vouchers table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  // Broadcast message (tables don't exist - disabled)
  const broadcastMessage = async (clientIds: string[], title: string, body: string) => {
    toast({
      title: 'Error',
      description: 'Notifications and messages tables not implemented',
      variant: 'destructive',
    });
    return false;
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