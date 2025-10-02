import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReservations } from '@/hooks/useReservations';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Loader2 } from 'lucide-react';

export default function BookSession() {
  const navigate = useNavigate();
  const { services, loading, getAvailableTimeSlots, createReservation } = useReservations();
  
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [blockedDates, setBlockedDates] = useState<Record<string, { fullDay: boolean; partial: boolean }>>({});

  useEffect(() => {
    async function fetchBlockedDates() {
      const { data, error } = await supabase
        .from('availabilities')
        .select('date, time_slot, is_available');
      
      if (error) {
        console.error('Error fetching blocked dates:', error);
        return;
      }
      
      // Organiza por data
      const map: Record<string, { total: number; blocked: number }> = {};
      data?.forEach(({ date, time_slot, is_available }) => {
        if (!map[date]) map[date] = { total: 0, blocked: 0 };
        map[date].total++;
        if (!is_available) map[date].blocked++;
      });

      // Marca se o dia está totalmente bloqueado ou parcialmente bloqueado
      const result: Record<string, { fullDay: boolean; partial: boolean }> = {};
      for (const date in map) {
        result[date] = {
          fullDay: map[date].total === map[date].blocked,
          partial: map[date].blocked > 0 && map[date].blocked < map[date].total,
        };
      }
      setBlockedDates(result);
    }
    fetchBlockedDates();

    // Realtime subscription for blocked dates
    const channel = supabase
      .channel('booking-availabilities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availabilities' },
        () => fetchBlockedDates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedDuration(0);
    setSelectedDate(null);
    setSelectedTimeSlot('');
  };

  const handleDurationChange = (duration: string) => {
    setSelectedDuration(Number(duration));
    setSelectedDate(null);
    setSelectedTimeSlot('');
  };

  const handleDateChange = (date: Date | Date[]) => {
    if (date instanceof Date) {
      setSelectedDate(date);
      setSelectedTimeSlot('');
    }
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const isoDate = date.toISOString().split('T')[0];
      if (blockedDates[isoDate]) {
        if (blockedDates[isoDate].fullDay) return 'bg-red-400 text-white rounded';
        if (blockedDates[isoDate].partial) return 'bg-orange-300 rounded';
      }
    }
    return '';
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDuration || !selectedDate || !selectedTimeSlot) {
      return;
    }

    const reservation = await createReservation(
      selectedService,
      selectedDuration,
      format(selectedDate, 'yyyy-MM-dd'),
      selectedTimeSlot
    );

    if (reservation) {
      const service = services.find(s => s.id === selectedService);
      const price = service?.duration_prices?.[selectedDuration] || service?.base_price || 0;
      
      navigate(
        `/payment?service_id=${selectedService}&duration=${selectedDuration}&date=${format(selectedDate, 'yyyy-MM-dd')}&time_slot=${selectedTimeSlot}&price=${price}`
      );
    }
  };

  const currentService = services.find(s => s.id === selectedService);
  const availableTimeSlots = selectedDate && selectedDuration 
    ? getAvailableTimeSlots(format(selectedDate, 'yyyy-MM-dd'), selectedDuration)
    : [];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Reservar Sessão</h1>

        {/* Step 1: Select Service */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Escolha o Serviço</CardTitle>
            <CardDescription>Selecione o tipo de sessão que deseja</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedService} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Select Duration */}
        {selectedService && currentService && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>2. Escolha a Duração</CardTitle>
              <CardDescription>Selecione quantas horas precisa</CardDescription>
            </CardHeader>
            <CardContent>
              {currentService.duration_prices ? (
                <Select value={selectedDuration.toString()} onValueChange={handleDurationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(currentService.duration_prices).map(([hours, price]) => (
                      <SelectItem key={hours} value={hours}>
                        {hours}h - €{Number(price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Duração fixa: 3h - €{currentService.base_price}
                  </p>
                  <Button 
                    onClick={() => setSelectedDuration(3)} 
                    className="mt-2"
                    variant={selectedDuration === 3 ? 'default' : 'outline'}
                  >
                    Selecionar 3 horas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Date */}
        {selectedDuration > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>3. Escolha a Data</CardTitle>
              <CardDescription>Selecione um dia disponível</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                locale="pt-PT"
                className="rounded-lg border"
                tileClassName={tileClassName}
              />
              <div className="ml-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-400 rounded"></div>
                  <span>Dia totalmente indisponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-300 rounded"></div>
                  <span>Dia parcialmente disponível</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Time Slot */}
        {selectedDate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>4. Escolha o Horário</CardTitle>
              <CardDescription>
                Data: {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableTimeSlots.map(slot => (
                    <Button
                      key={slot.id}
                      variant={selectedTimeSlot === slot.time_slot ? 'default' : 'outline'}
                      onClick={() => setSelectedTimeSlot(slot.time_slot)}
                      className="h-12"
                    >
                      {slot.time_slot.substring(0, 5)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Não há horários disponíveis para esta data e duração
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm Button */}
        {selectedTimeSlot && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-lg mb-1">Resumo da Reserva</p>
                  <p className="text-sm text-muted-foreground">
                    {currentService?.name} • {selectedDuration}h •{' '}
                    {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: pt })} •{' '}
                    {selectedTimeSlot.substring(0, 5)}
                  </p>
                  <p className="text-2xl font-bold mt-2 text-primary">
                    €{currentService?.duration_prices?.[selectedDuration] || currentService?.base_price}
                  </p>
                </div>
                <Button size="lg" onClick={handleConfirm} className="w-full md:w-auto">
                  Confirmar e Pagar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
