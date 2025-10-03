import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { format, startOfDay, addMinutes, parse, isBefore, isAfter, isSameDay } from 'date-fns';

interface Service {
  id: string;
  name: string;
  type: string;
  base_price: number;
  description: string;
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
  const { createNotification } = useNotifications();
  
  const [services, setServices] = useState<Service[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<UnavailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch services
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .in('type', ['recording', 'mixing', 'mastering'])
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive',
      });
    }
  };

  // Fetch availability rules
  const fetchAvailabilityRules = async () => {
    try {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('is_active', true)
        .order('day_of_week');

      if (error) throw error;
      setAvailabilityRules(data || []);
    } catch (error) {
      console.error('Error fetching availability rules:', error);
    }
  };

  // Fetch blackout dates
  const fetchBlackoutDates = async () => {
    try {
      const { data, error } = await supabase
        .from('blackout_dates')
        .select('date, reason')
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .order('date');

      if (error) throw error;
      setBlackoutDates(data || []);
    } catch (error) {
      console.error('Error fetching blackout dates:', error);
    }
  };

  // Fetch existing bookings for a specific date
  const fetchBookingsForDate = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, date, start_time, end_time, status')
        .eq('date', dateStr)
        .in('status', ['confirmed', 'pending']);

      if (bookingsError) throw bookingsError;
      setExistingBookings(bookingsData || []);

      // Fetch unavailable slots for this date
      const startOfDayDate = `${dateStr}T00:00:00`;
      const endOfDayDate = `${dateStr}T23:59:59`;
      
      const { data: slotsData, error: slotsError } = await supabase
        .from('unavailable_slots')
        .select('start_time, end_time')
        .gte('start_time', startOfDayDate)
        .lte('start_time', endOfDayDate);

      if (slotsError) throw slotsError;
      setUnavailableSlots(slotsData || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Check if a date is available (has rules and not blacked out)
  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');

    // Check if there are availability rules for this day
    const hasRules = availabilityRules.some(rule => {
      const effectiveFrom = new Date(rule.effective_from);
      const effectiveTo = rule.effective_to ? new Date(rule.effective_to) : null;
      
      return rule.day_of_week === dayOfWeek &&
             !isBefore(date, effectiveFrom) &&
             (!effectiveTo || !isAfter(date, effectiveTo));
    });

    // Check if date is blacked out
    const isBlackedOut = blackoutDates.some(blackout => blackout.date === dateStr);

    return hasRules && !isBlackedOut && !isBefore(date, startOfDay(new Date()));
  };

  // Generate time slots for a specific date with session duration constraint
  const generateTimeSlots = (date: Date, sessionDurationMinutes: number = 30): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Studio closes at 22:00
    const studioCloseTime = parse('22:00:00', 'HH:mm:ss', new Date());
    
    // Get availability rules for this day
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
        
        // Check if session would end after studio closing time (22:00)
        const sessionEnd = addMinutes(currentTime, sessionDurationMinutes);
        const exceedsCloseTime = isAfter(sessionEnd, studioCloseTime);
        
        if (!isAfter(slotEnd, endTime) && !exceedsCloseTime) {
          const slotStartStr = format(currentTime, 'HH:mm:ss');
          const slotEndStr = format(slotEnd, 'HH:mm:ss');
          
          // Check if slot conflicts with existing bookings (including 1h buffer after each booking)
          const isBookingConflict = existingBookings.some(booking => {
            const bookingStart = parse(booking.start_time, 'HH:mm:ss', new Date());
            const bookingEnd = parse(booking.end_time, 'HH:mm:ss', new Date());
            // Add 1 hour buffer after booking ends
            const bookingEndWithBuffer = addMinutes(bookingEnd, 60);
            
            // Check if new session would overlap with existing booking + buffer
            return (
              (isBefore(currentTime, bookingEndWithBuffer) && isAfter(sessionEnd, bookingStart))
            );
          });

          // Check if slot conflicts with unavailable slots
          const isUnavailableConflict = unavailableSlots.some(slot => {
            const slotStart = new Date(slot.start_time);
            const slotEnd = new Date(slot.end_time);
            
            // Create proper date objects for comparison
            const sessionStartDate = new Date(date);
            sessionStartDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
            
            const sessionEndDate = new Date(date);
            sessionEndDate.setHours(sessionEnd.getHours(), sessionEnd.getMinutes(), 0, 0);
            
            // Check if new session would overlap with unavailable slot
            return (
              (isBefore(sessionStartDate, slotEnd) && isAfter(sessionEndDate, slotStart))
            );
          });

          const isConflict = isBookingConflict || isUnavailableConflict;

          slots.push({
            start_time: slotStartStr,
            end_time: slotEndStr,
            available: !isConflict,
          });
        }
        currentTime = addMinutes(currentTime, 30);
      }
    });

    return slots;
  };

  // Create booking
  const createBooking = async (serviceId: string, date: Date, startTime: string, endTime: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          service_id: serviceId,
          date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      // Create unavailable slot with 1 hour buffer
      const dateStr = format(date, 'yyyy-MM-dd');
      const startDateTime = `${dateStr}T${startTime}`;
      const endDateTime = parse(endTime, 'HH:mm:ss', new Date());
      const endWithBuffer = addMinutes(endDateTime, 60); // Add 1 hour buffer
      const endWithBufferStr = `${dateStr}T${format(endWithBuffer, 'HH:mm:ss')}`;

      await supabase
        .from('unavailable_slots')
        .insert({
          start_time: startDateTime,
          end_time: endWithBufferStr,
          reason: 'Sessão reservada + descanso'
        });

      // Create admin notification
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminProfile) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminProfile.id,
            title: 'New Session Booked',
            body: `A new ${services.find(s => s.id === serviceId)?.name} session has been booked for ${format(date, 'PPP')} at ${startTime}`,
          });
      }

      toast({
        title: 'Booking Confirmed',
        description: 'Your session has been successfully booked!',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send message to direct thread
  const sendBookingMessage = async (serviceId: string, date: Date, startTime: string) => {
    if (!user) return;

    try {
      const service = services.find(s => s.id === serviceId);
      const messageText = `Your ${service?.name} session is confirmed for ${format(date, 'EEEE, MMMM do, yyyy')} at ${format(parse(startTime, 'HH:mm:ss', new Date()), 'h:mm a')}.\n\n📍 Studio Location: 7T7Studios, [Address to be provided]\n\n📋 Session Rules:\n• Arrive 15 minutes early for setup\n• Bring your ID and any personal equipment\n• No outside food or drinks\n• Respect studio equipment and environment\n\nWe're excited to work with you! 🎵`;

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminProfile) {
        await supabase
          .from('messages')
          .insert({
            sender_id: adminProfile.id,
            receiver_id: user.id,
            thread_id: crypto.randomUUID(),
            message: messageText,
            timestamp: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error sending booking message:', error);
    }
  };

  // Generate WhatsApp link
  const generateWhatsAppLink = (serviceId: string, date: Date, startTime: string): string => {
    const service = services.find(s => s.id === serviceId);
    const messageText = `Hi! Your ${service?.name} session is confirmed for ${format(date, 'EEEE, MMMM do, yyyy')} at ${format(parse(startTime, 'HH:mm:ss', new Date()), 'h:mm a')}.\n\n📍 Studio Location: 7T7Studios, [Address to be provided]\n\n📋 Session Rules:\n• Arrive 15 minutes early for setup\n• Bring your ID and any personal equipment\n• No outside food or drinks\n• Respect studio equipment and environment\n\nWe're excited to work with you! 🎵`;
    
    return `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  };

  useEffect(() => {
    fetchServices();
    fetchAvailabilityRules();
    fetchBlackoutDates();
  }, []);

  return {
    services,
    loading,
    isDateAvailable,
    generateTimeSlots,
    fetchBookingsForDate,
    createBooking,
    sendBookingMessage,
    generateWhatsAppLink,
  };
};