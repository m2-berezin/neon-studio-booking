import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Availability {
  id: string;
  date: string;
  time_slot: string;
  is_available: boolean;
}

const DEFAULT_TIME_SLOTS = [
  '09:00:00',
  '10:00:00',
  '11:00:00',
  '14:00:00',
  '15:00:00',
  '16:00:00',
  '17:00:00'
];

export const useAvailabilities = () => {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailabilities();
    
    // Realtime subscription
    const channel = supabase
      .channel('availabilities-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'availabilities' },
        () => loadAvailabilities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAvailabilities = async () => {
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error) {
      console.error('Error loading availabilities:', error);
      toast.error('Erro ao carregar disponibilidades');
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilities.filter(a => a.date === dateStr);
  };

  const toggleAvailability = async (date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // Check if availability exists
      const existing = availabilities.find(
        a => a.date === dateStr && a.time_slot === timeSlot
      );

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('availabilities')
          .update({ is_available: !existing.is_available })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('availabilities')
          .insert({
            date: dateStr,
            time_slot: timeSlot,
            is_available: true
          });

        if (error) throw error;
      }

      await loadAvailabilities();
      toast.success('Disponibilidade atualizada');
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const createAvailabilitiesForDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const existingSlots = availabilities
        .filter(a => a.date === dateStr)
        .map(a => a.time_slot);

      const newSlots = DEFAULT_TIME_SLOTS.filter(
        slot => !existingSlots.includes(slot)
      );

      if (newSlots.length === 0) {
        toast.info('Todos os horários já foram criados para esta data');
        return;
      }

      const { error } = await supabase
        .from('availabilities')
        .insert(
          newSlots.map(slot => ({
            date: dateStr,
            time_slot: slot,
            is_available: true
          }))
        );

      if (error) throw error;

      await loadAvailabilities();
      toast.success(`${newSlots.length} horários criados`);
    } catch (error) {
      console.error('Error creating availabilities:', error);
      toast.error('Erro ao criar disponibilidades');
    }
  };

  return {
    availabilities,
    loading,
    DEFAULT_TIME_SLOTS,
    getAvailabilityForDate,
    toggleAvailability,
    createAvailabilitiesForDate,
    refreshAvailabilities: loadAvailabilities
  };
};
