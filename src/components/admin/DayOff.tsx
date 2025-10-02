import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

export default function DayOff() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  async function fetchAvailabilities(date: Date) {
    const isoDate = date.toISOString().split('T')[0];
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('date', isoDate);

      if (error) throw error;

      // Inicializa todos horários como disponíveis (true)
      const availabilityMap: Record<string, boolean> = {};
      TIME_SLOTS.forEach(slot => {
        availabilityMap[slot] = true;
      });

      // Atualiza conforme banco
      data?.forEach(row => {
        availabilityMap[row.time_slot] = row.is_available ?? true;
      });

      setAvailabilities(availabilityMap);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
      toast.error('Erro ao buscar disponibilidades');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailabilities(selectedDate);

    // Realtime subscription
    const channel = supabase
      .channel('dayoff-availabilities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availabilities' },
        () => fetchAvailabilities(selectedDate)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  async function toggleAvailability(time_slot: string) {
    const isoDate = selectedDate.toISOString().split('T')[0];
    const currentStatus = availabilities[time_slot];

    try {
      // Verifica se já existe registro para este horário
      const { data: existing } = await supabase
        .from('availabilities')
        .select('id')
        .eq('date', isoDate)
        .eq('time_slot', time_slot)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('availabilities')
          .update({ is_available: !currentStatus })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('availabilities')
          .insert([{ date: isoDate, time_slot, is_available: false }]);
        if (error) throw error;
      }

      setAvailabilities(prev => ({
        ...prev,
        [time_slot]: !currentStatus,
      }));

      toast.success(
        `Horário ${time_slot} marcado como ${!currentStatus ? 'disponível' : 'indisponível'}`
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marcar Day Off / Horários Indisponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Calendar
              value={selectedDate}
              onChange={(date) => setSelectedDate(date as Date)}
              minDate={new Date()}
              maxDate={new Date(new Date().setDate(new Date().getDate() + 60))}
              className="rounded-lg border"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              Horários para {selectedDate.toLocaleDateString('pt-PT')}
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TIME_SLOTS.map(slot => (
                  <Button
                    key={slot}
                    onClick={() => toggleAvailability(slot)}
                    variant={availabilities[slot] === false ? 'destructive' : 'default'}
                    className="h-16 flex flex-col gap-1"
                  >
                    <span className="text-lg font-bold">{slot}</span>
                    <span className="text-xs">
                      {availabilities[slot] === false ? 'Indisponível' : 'Disponível'}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
