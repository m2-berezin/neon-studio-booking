import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, addMinutes, parse, isBefore, isAfter, isSameDay } from 'date-fns';

interface Service {
  id: string;
  name: string;
  base_price: number;
  description: string;
  duration_minutes?: number;
}

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
  date: string;
  reason: string;
}

interface Booking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface UnavailableSlot {
  start_time: string;
  end_time: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export const useBooking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [services, setServices] = useState<Service[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<UnavailableSlot[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch services
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      // Map to expected format
      const mappedServices = (data || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description || '',
        base_price: Number(service.price_eur) || 0,
        duration_minutes: service.duration_minutes
      }));
      
      setServices(mappedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive',
      });
    }
  };

  // Fetch availability rules (tables don't exist - using defaults)
  const fetchAvailabilityRules = async () => {
    // Default rules (Mon-Sun, 10:00-22:00)
    const defaultRules: AvailabilityRule[] = [];
    for (let day = 0; day <= 6; day++) {
      defaultRules.push({
        id: `default-${day}`,
        day_of_week: day,
        start_time: '10:00:00',
        end_time: '22:00:00',
        effective_from: '2024-01-01',
        effective_to: null,
        is_active: true
      });
    }
    setAvailabilityRules(defaultRules);
  };

  // Fetch blackout dates (table doesn't exist)
  const fetchBlackoutDates = async () => {
    setBlackoutDates([]);
  };

  // Fetch unavailable days for a given month
  const fetchUnavailableDays = async (month: number, year: number) => {
    try {
      const { data, error } = await supabase.rpc('get_unavailable_days', {
        p_month: month,
        p_year: year
      });

      if (error) throw error;
      
      setUnavailableDays(data?.map((row: any) => row.day) || []);
    } catch (error) {
      console.error('Error fetching unavailable days:', error);
      setUnavailableDays([]);
    }
  };

  // Fetch unavailable time slots for a specific date
  const fetchBookingsForDate = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_unavailable_times', {
        p_date: dateStr
      });

      if (error) throw error;
      
      const slots = (data || []).map((slot: any) => ({
        start_time: format(new Date(slot.starts_at), 'HH:mm:ss'),
        end_time: format(new Date(slot.ends_at), 'HH:mm:ss')
      }));
      
      setUnavailableSlots(slots);
      setExistingBookings([]);
    } catch (error) {
      console.error('Error fetching unavailable times:', error);
      setUnavailableSlots([]);
      setExistingBookings([]);
    }
  };

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');

    const hasRules = availabilityRules.some(rule => {
      const effectiveFrom = new Date(rule.effective_from);
      const effectiveTo = rule.effective_to ? new Date(rule.effective_to) : null;
      
      return rule.day_of_week === dayOfWeek &&
             !isBefore(date, effectiveFrom) &&
             (!effectiveTo || !isAfter(date, effectiveTo));
    });

    const isBlackedOut = blackoutDates.some(blackout => blackout.date === dateStr);

    return hasRules && !isBlackedOut && !isBefore(date, startOfDay(new Date()));
  };

  // Check if a time range overlaps with unavailable slots
  const hasTimeOverlap = (slotStart: string, sessionDuration: number): boolean => {
    const slotStartTime = parse(slotStart, 'HH:mm:ss', new Date());
    const sessionEndTime = addMinutes(slotStartTime, sessionDuration);

    return unavailableSlots.some(unavailable => {
      const unavailStart = parse(unavailable.start_time, 'HH:mm:ss', new Date());
      const unavailEnd = parse(unavailable.end_time, 'HH:mm:ss', new Date());

      // Check if session overlaps with unavailable slot
      return isBefore(slotStartTime, unavailEnd) && isAfter(sessionEndTime, unavailStart);
    });
  };

  // Generate time slots for a specific date
  const generateTimeSlots = (date: Date, sessionDurationMinutes: number = 30): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const studioCloseTime = parse('22:00:00', 'HH:mm:ss', new Date());
    
    const dayRules = availabilityRules.filter(rule => {
      const effectiveFrom = new Date(rule.effective_from);
      const effectiveTo = rule.effective_to ? new Date(rule.effective_to) : null;
      
      return rule.day_of_week === dayOfWeek &&
             !isBefore(date, effectiveFrom) &&
             (!effectiveTo || !isAfter(date, effectiveTo));
    });

    const slots: TimeSlot[] = [];

    dayRules.forEach(rule => {
      const startTime = parse(rule.start_time, 'HH:mm:ss', new Date());
      const endTime = parse(rule.end_time, 'HH:mm:ss', new Date());
      
      let currentTime = startTime;
      
      while (isBefore(currentTime, endTime)) {
        const slotEnd = addMinutes(currentTime, 30);
        const sessionEnd = addMinutes(currentTime, sessionDurationMinutes);
        const exceedsCloseTime = isAfter(sessionEnd, studioCloseTime);
        
        if (!isAfter(slotEnd, endTime) && !exceedsCloseTime) {
          const slotStartStr = format(currentTime, 'HH:mm:ss');
          const slotEndStr = format(slotEnd, 'HH:mm:ss');
          
          // Check if this slot overlaps with any unavailable time
          const isAvailable = !hasTimeOverlap(slotStartStr, sessionDurationMinutes);
          
          slots.push({
            start_time: slotStartStr,
            end_time: slotEndStr,
            available: isAvailable,
          });
        }
        currentTime = addMinutes(currentTime, 30);
      }
    });

    return slots;
  };

  // Check if time slot has conflicts (always returns no conflict)
  const checkTimeSlotConflict = async (date: Date, startTime: string, durationMinutes: number): Promise<{ hasConflict: boolean; message?: string }> => {
    return { hasConflict: false };
  };

  // Create booking (disabled - table doesn't exist)
  const createBooking = async (serviceId: string, date: Date, startTime: string, endTime: string) => {
    toast({
      title: 'Error',
      description: 'Bookings table not implemented',
      variant: 'destructive',
    });
    throw new Error('Bookings not supported');
  };

  // Cancel booking (disabled)
  const cancelBooking = async (bookingId: string) => {
    toast({
      title: 'Error',
      description: 'Bookings table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  // Reschedule booking (disabled)
  const rescheduleBooking = async (bookingId: string, newDate: Date, newStartTime: string, newEndTime: string) => {
    toast({
      title: 'Error',
      description: 'Bookings table not implemented',
      variant: 'destructive',
    });
    return false;
  };

  // Load initial data
  useEffect(() => {
    fetchServices();
    fetchAvailabilityRules();
    fetchBlackoutDates();
  }, []);

  // Stub methods for compatibility
  const sendBookingMessage = async (message: string) => {};
  const generateWhatsAppLink = (service: string, date: string, time: string) => '';

  return {
    services,
    availabilityRules,
    blackoutDates,
    existingBookings,
    unavailableSlots,
    unavailableDays,
    loading,
    fetchServices,
    fetchBookingsForDate,
    fetchUnavailableDays,
    isDateAvailable,
    generateTimeSlots,
    checkTimeSlotConflict,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    sendBookingMessage,
    generateWhatsAppLink,
  };
};
