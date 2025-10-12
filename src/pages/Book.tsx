import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBooking } from '@/hooks/useBooking';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parse } from 'date-fns';
import { pt } from 'date-fns/locale';
import PriceSummary from '@/components/PriceSummary';
import { RealtimeSyncProvider } from '@/components/RealtimeSyncProvider';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Music, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

const Book = () => {
  const navigate = useNavigate();
  const { 
    loading, 
    createBooking, 
    fetchBookingsForDate, 
    fetchUnavailableDays,
    generateTimeSlots, 
    isDateAvailable,
    unavailableDays,
    sendBookingMessage, 
    generateWhatsAppLink 
  } = useBooking();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Check for reservation ID from offer application
  const [reservationFromOffer, setReservationFromOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // Timer em segundos
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get('reservation');
    
    if (reservationId) {
      fetchReservationDetails(reservationId);
    }
  }, []);
  
  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (timeLeft === 0 && reservationFromOffer) {
        handleOfferTimeout();
      }
      return;
    }
    
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timeLeft, reservationFromOffer]);
  
  const handleOfferTimeout = async () => {
    if (!reservationFromOffer) return;
    
    try {
      await supabase.rpc('abandon_offer', { p_reservation_id: reservationFromOffer.id });
      
      toast({
        title: 'Tempo esgotado',
        description: 'A oferta foi cancelada. Podes aplicá-la novamente.',
        variant: 'destructive',
      });
      
      setReservationFromOffer(null);
      setTimeLeft(null);
      navigate('/rewards');
    } catch (error) {
      console.error('Error abandoning offer:', error);
    }
  };
  
  const fetchReservationDetails = async (reservationId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setReservationFromOffer(data);
        // Pre-select service as "captacao" since it's from offer
        setSelectedService('captacao');
        setSelectedBackendServiceId(data.service_id);
        setStep(2); // Go directly to calendar
        
        // Iniciar timer de 5min (300 segundos)
        setTimeLeft(300);
        
        toast({
          title: 'Oferta aplicada',
          description: `3h totais (2h pagas + 1h grátis) por €${data.price_eur_snapshot}`,
        });
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a reserva',
        variant: 'destructive',
      });
    }
  };

  // Service IDs from backend (Supabase)
  const BACKEND_SERVICE_IDS = {
    captacao2h: 'b1041ae7-af06-494e-89e3-a3eafcd1e8e0', // Captacao 2h - 20EUR
    captacao3h: 'dd60e9fe-395f-4b16-a4c9-96a7d96696a6', // Captacao 3h - 30EUR
    captacao4h: '2c91d14c-a08a-4d31-99e7-13630ced02cd', // Captacao 4h - 40EUR
    captacao5h: 'ecd1a25b-7188-4ec7-9ae9-237a0fe380d1', // Captacao 5h - 50EUR
    captacaoMixMaster: '3542c1c1-544c-4aa6-b157-7f909468aa4a', // Captacao 3h + MixMaster - 70EUR
  };

  const services = [
    {
      id: 'captacao',
      name: 'Captação 2h (mínimo)',
      base_price: 20,
      type: 'captacao',
      description: 'Sessão de gravação profissional',
      duration: 120,
      hasHourSelector: true,
      backendServiceId: BACKEND_SERVICE_IDS.captacao2h // Default to 2h
    },
    {
      id: 'captacao_mixmaster',
      name: 'Captação 3h + Mix & Master',
      base_price: 70,
      subscriptionPrice: 59.5,
      type: 'captacao_mixmaster',
      description: 'Pacote completo: captação 3h + mistura e masterização',
      duration: 180, // 3h puro
      hasHourSelector: false, // Sem seletor, vai direto ao calendário
      backendServiceId: BACKEND_SERVICE_IDS.captacaoMixMaster
    }
  ];

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedHours, setSelectedHours] = useState<number>(2);
  const [selectedMixMasterHours, setSelectedMixMasterHours] = useState<number>(3);
  const [selectedBackendServiceId, setSelectedBackendServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [whatsAppLink, setWhatsAppLink] = useState<string>('');

  // Fetch unavailable days when month changes
  useEffect(() => {
    const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentMonth.getFullYear();
    fetchUnavailableDays(month, year);
  }, [currentMonth, fetchUnavailableDays]);

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // Reset hours to 2 when selecting a new service
    setSelectedHours(2);
    
    // Reset date and slots when changing service
    setSelectedDate(undefined);
    setTimeSlots([]);
    
    // Set initial backend service ID
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedBackendServiceId(service.backendServiceId);
    }
    
    // If service has hour selector, don't advance step yet
    if (!service?.hasHourSelector) {
      setStep(2);
    }
  };

  // Handle hour selection change
  const handleHoursChange = async (hours: number) => {
    setSelectedHours(hours);
    
    // Update backend service ID based on selected hours
    const hourToServiceMap: { [key: number]: string } = {
      2: BACKEND_SERVICE_IDS.captacao2h,
      3: BACKEND_SERVICE_IDS.captacao3h,
      4: BACKEND_SERVICE_IDS.captacao4h,
      5: BACKEND_SERVICE_IDS.captacao5h,
    };
    
    setSelectedBackendServiceId(hourToServiceMap[hours]);
    
    // If a date is already selected, regenerate time slots with new duration
    if (selectedDate) {
      const unavailableSlots = await fetchBookingsForDate(selectedDate);
      const sessionDuration = hours * 60;
      const slots = generateTimeSlots(selectedDate, sessionDuration, unavailableSlots);
      setTimeSlots(slots);
    }
  };

  // Handle mix&master hours selection
  const handleMixMasterHoursChange = async (hours: number) => {
    setSelectedMixMasterHours(hours);
    
    // Mix&Master always uses the same service ID (3h base + mix)
    setSelectedBackendServiceId(BACKEND_SERVICE_IDS.captacaoMixMaster);
    
    // If a date is already selected, regenerate time slots with new duration
    if (selectedDate) {
      const unavailableSlots = await fetchBookingsForDate(selectedDate);
      const sessionDuration = 240; // 3h captação + 1h mix = 240min
      const slots = generateTimeSlots(selectedDate, sessionDuration, unavailableSlots);
      setTimeSlots(slots);
    }
  };

  // Calculate dynamic price for recording service
  const getRecordingPrice = () => {
    if (selectedService === 'captacao') {
      return selectedHours * 10; // €10 per hour
    }
    return 70; // Mix&Master base price
  };

  // Get service with updated price and backend service ID
  const getServiceWithPrice = (service: any) => {
    if (service.id === 'captacao') {
      return {
        ...service,
        base_price: getRecordingPrice(),
        duration: selectedHours * 60,
        backendServiceId: selectedBackendServiceId
      };
    }
    if (service.id === 'captacao_mixmaster') {
      return {
        ...service,
        base_price: 70,
        duration: 180, // 3h puro
        backendServiceId: selectedBackendServiceId
      };
    }
    return service;
  };

  // Handle date selection
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    console.log('📅 [BOOK PAGE] Date selected:', format(date, 'yyyy-MM-dd'));
    
    setSelectedDate(date);
    
    // Calculate session duration based on service and selected hours
    const service = services.find(s => s.id === selectedService);
    let sessionDuration = 120; // default 2h
    
    // If from offer, use 180 minutes (3h total)
    if (reservationFromOffer) {
      sessionDuration = reservationFromOffer.duration_minutes_snapshot || 180;
    } else if (service?.id === 'captacao') {
      sessionDuration = selectedHours * 60;
    } else if (service?.id === 'captacao_mixmaster') {
      sessionDuration = 180; // 3h puro
    } else {
      sessionDuration = service?.duration || 120;
    }
    
    console.log('📅 [BOOK PAGE] Session duration:', sessionDuration, 'minutes');
    
    // Fetch unavailable times for this date and wait for completion
    const unavailableSlots = await fetchBookingsForDate(date);
    
    console.log('📅 [BOOK PAGE] Fetched bookings:', unavailableSlots.length, 'blocked ranges');
    console.log('📅 [BOOK PAGE] Now generating time slots...');
    
    // Generate time slots - pass the unavailable slots directly to avoid state timing issues
    const slots = generateTimeSlots(date, sessionDuration, unavailableSlots);
    
    console.log('📅 [BOOK PAGE] Generated slots:', slots.length, 'total');
    console.log('📅 [BOOK PAGE] Available slots:', slots.filter(s => s.available).length);
    console.log('📅 [BOOK PAGE] Blocked slots:', slots.filter(s => !s.available).length);
    
    setTimeSlots(slots);
    setStep(3);
  };

  // Handle time slot selection
  const handleSlotSelect = async (slot: TimeSlot) => {
    if (!slot.available) return;
    
    setSelectedSlot(slot);
    
    // If from offer, update the reservation with starts_at and ends_at
    if (reservationFromOffer && selectedDate) {
      try {
        const startsAt = new Date(selectedDate);
        const [hours, minutes] = slot.start_time.split(':');
        startsAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const duration = reservationFromOffer.duration_minutes_snapshot || 180;
        const endsAt = new Date(startsAt.getTime() + duration * 60000);
        
        const { error } = await supabase
          .from('reservations')
          .update({
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString()
          })
          .eq('id', reservationFromOffer.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error updating reservation:', error);
      }
    }
    
    setStep(4);
  };

  // Handle booking confirmation
  const handleBookingConfirm = async () => {
    if (!selectedBackendServiceId || !selectedDate || !selectedSlot) return;

    try {
      // Use the backend service ID for creating booking
      await createBooking(
        selectedBackendServiceId,
        selectedDate,
        selectedSlot.start_time,
        selectedSlot.end_time
      );

      // Notify admin about new booking
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          const userName = profile?.full_name || user.email || 'Cliente';
          const serviceName = services.find(s => s.id === selectedService)?.name || 'Serviço';
          
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              user_id: admin.id,
              title: 'Nova Reserva',
              body: `${userName} fez uma nova reserva de ${serviceName} para ${format(selectedDate, 'dd/MM/yyyy')} às ${selectedSlot.start_time}`,
              read: false
            }));

            // Notifications table doesn't exist - disabled
            // await supabase.from<any>('notifications').insert(notifications);
          }
        } catch (error) {
          console.error('Error notifying admin:', error);
        }
      }

      // Send in-app message (stub)
      const serviceName = services.find(s => s.id === selectedService)?.name || 'Serviço';
      await sendBookingMessage(`Reserva confirmada: ${serviceName} para ${format(selectedDate, 'dd/MM/yyyy')} às ${selectedSlot.start_time}`);

      // Generate WhatsApp link (stub)
      const link = generateWhatsAppLink(serviceName, format(selectedDate, 'dd/MM/yyyy'), selectedSlot.start_time);
      setWhatsAppLink(link);

      setBookingComplete(true);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  // Reset booking flow
  const resetBooking = () => {
    setStep(1);
    setSelectedService('');
    setSelectedDate(undefined);
    setSelectedSlot(undefined);
    setTimeSlots([]);
    setBookingComplete(false);
    setWhatsAppLink('');
    setReservationFromOffer(null);
    setTimeLeft(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Calculate end time based on start time and duration in minutes
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hoursStr, minutesStr] = startTime.split(':');
    const startHour = parseInt(hoursStr);
    const startMinute = parseInt(minutesStr);
    
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
  };

  // Get formatted time range for display
  const getTimeRange = (): string => {
    if (!selectedSlot) return '';
    
    const startTime = selectedSlot.start_time.slice(0, 5);
    
    if (selectedService === 'captacao') {
      const endTime = calculateEndTime(selectedSlot.start_time, selectedHours * 60);
      return `${startTime} - ${endTime.slice(0, 5)}`;
    }
    
    if (selectedService === 'captacao_mixmaster') {
      const endTime = calculateEndTime(selectedSlot.start_time, 180); // 3h puro
      return `${startTime} - ${endTime.slice(0, 5)}`;
    }
    
    return `${startTime} - ${selectedSlot.end_time.slice(0, 5)}`;
  };

  // Timer countdown para ofertas
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Timeout: chamar abandon_offer
          if (reservationFromOffer) {
            handleAbandonOffer(reservationFromOffer.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeLeft]);
  
  const handleAbandonOffer = async (reservationId: string) => {
    try {
      const { data, error } = await supabase.rpc('abandon_offer', {
        p_reservation_id: reservationId
      });
      
      if (error) throw error;
      
      toast({
        title: 'Tempo expirado',
        description: 'A oferta foi libertada. Podes aplicar novamente.',
        variant: 'destructive',
      });
      
      // Reset e volta para home
      setReservationFromOffer(null);
      setTimeLeft(null);
      navigate('/');
    } catch (error) {
      console.error('Error abandoning offer:', error);
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get selected service details with dynamic pricing
  const selectedServiceDetails = selectedService 
    ? getServiceWithPrice(services.find(s => s.id === selectedService))
    : undefined;

  if (bookingComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="neon-heading">
            Reserva Confirmada!
          </h1>
          <p className="text-muted-foreground">
            A tua sessão foi reservada com sucesso
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Detalhes da Sessão</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium">Serviço:</span> {selectedServiceDetails?.name}</p>
                {selectedService === 'recording' && (
                  <p><span className="font-medium">Duração:</span> {selectedHours}h</p>
                )}
                <p><span className="font-medium">Data:</span> {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
                <p><span className="font-medium">Horário:</span> {getTimeRange()}</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Button
                onClick={() => window.open(whatsAppLink, '_blank')}
                size="xl"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Abrir no WhatsApp
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Os detalhes da sessão também foram enviados para as tuas Mensagens
              </p>
            </div>
          </div>
        </Card>

        <Button onClick={resetBooking} variant="outline" size="xl" className="w-full">
          Reservar Outra Sessão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Reservar uma Sessão
        </h1>
        <p className="text-muted-foreground">
          Agenda a tua sessão de gravação em alguns passos simples
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-6">
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {i}
            </div>
            {i < 4 && (
              <div className={cn(
                "w-8 h-8 mx-2 flex items-center justify-center",
                step > i ? "text-primary" : "text-muted"
              )}>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Choose Service */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Escolhe o Teu Serviço</h2>
          <div className="space-y-3">
            {services.map((service) => {
              const isCaptacao = service.id === 'captacao';
              const isSelected = selectedService === service.id;
              const currentPrice = isCaptacao ? getRecordingPrice() : service.base_price;

              return (
                <Card
                  key={service.id}
                  className={cn(
                    "p-4 transition-shadow",
                    isSelected && isCaptacao ? "border-primary" : "cursor-pointer hover:shadow-md"
                  )}
                  onClick={() => !isSelected && handleServiceSelect(service.id)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Music className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="space-y-1">
                          <div className="flex flex-col">
                            <p className="text-lg font-bold">€{currentPrice}</p>
                            {service.subscriptionPrice && (
                              <p className="text-lg font-bold text-primary">€{service.subscriptionPrice} <span className="text-xs text-muted-foreground">(com subscrição)</span></p>
                            )}
                          </div>
                          {service.subscriptionPrice && (
                            <p className="text-xs text-green-600">Poupe 15% com subscrição</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hour Selector for Captacao Service */}
                    {isSelected && isCaptacao && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Número de Horas</label>
                          <Select
                            value={selectedHours.toString()}
                            onValueChange={(value) => handleHoursChange(parseInt(value))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione as horas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 horas - €20</SelectItem>
                              <SelectItem value="3">3 horas - €30</SelectItem>
                              <SelectItem value="4">4 horas - €40</SelectItem>
                              <SelectItem value="5">5 horas - €50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={() => setStep(2)} 
                          className="w-full"
                        >
                          Continuar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Choose Date */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold">Escolher Data</h2>
          </div>
          
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              Seleccionado: <span className="font-medium text-foreground">{selectedServiceDetails?.name}</span>
            </p>
          </div>

          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={setCurrentMonth}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);
                
                // Block today and any dates that aren't available
                return checkDate <= today || !isDateAvailable(date);
              }}
              modifiers={{
                occupied: (date) => {
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  const year = date.getFullYear();
                  const currentMonthNum = currentMonth.getMonth() + 1;
                  const currentYear = currentMonth.getFullYear();
                  
                  return month === currentMonthNum && 
                         year === currentYear && 
                         unavailableDays.includes(day);
                }
              }}
              modifiersClassNames={{
                occupied: "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50"
              }}
              className="rounded-md border pointer-events-auto"
            />
          </div>
          
          <div className="flex justify-center mt-3">
            <p className="text-xs text-muted-foreground italic">
              Não é possível reservar para o dia de hoje
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-muted-foreground">Com reservas</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Choose Time */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold">Escolher Horário</h2>
          </div>
          
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
            {selectedService === 'captacao' && (
              <p className="text-xs text-muted-foreground mt-2">
                Sessão de {selectedHours}h | Estúdio fecha às 22:00
              </p>
            )}
            {selectedService === 'captacao_mixmaster' && (
              <p className="text-xs text-muted-foreground mt-2">
                Sessão de 3h (captação + mix&master) | Estúdio fecha às 22:00
              </p>
            )}
            {reservationFromOffer && (
              <p className="text-xs text-muted-foreground mt-2">
                Oferta: 3h totais (2h pagas + 1h grátis) por €{reservationFromOffer.price_eur_snapshot}
              </p>
            )}
          </div>

          <TooltipProvider>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot, index) => {
                // Wrap disabled slots in tooltip
                if (!slot.available) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          disabled={true}
                          className="h-12 flex flex-col items-center justify-center bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-50 cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-700"
                        >
                          <Clock className="w-4 h-4 mb-1" />
                          <span className="text-xs">
                            {slot.start_time.slice(0, 5)}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Indisponível - já reservado com buffer de limpeza</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSlotSelect(slot)}
                    className="h-12 flex flex-col items-center justify-center"
                  >
                    <Clock className="w-4 h-4 mb-1" />
                    <span className="text-xs">
                      {slot.start_time.slice(0, 5)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </TooltipProvider>

          {timeSlots.filter(s => s.available).length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum horário disponível para esta data</p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirm Booking */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold">Confirmar Reserva</h2>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo da Reserva</h3>
              <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-medium">
                  {reservationFromOffer 
                    ? reservationFromOffer.service_name_snapshot 
                    : selectedServiceDetails?.name
                  }
                </span>
              </div>
              {reservationFromOffer && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">
                    3h totais (2h pagas + 1h grátis), {selectedSlot?.start_time.slice(0, 5)} - {calculateEndTime(selectedSlot?.start_time || '', 180).slice(0, 5)}
                  </span>
                </div>
              )}
              {!reservationFromOffer && selectedService === 'captacao' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">{selectedHours}h</span>
                </div>
              )}
              {!reservationFromOffer && selectedService === 'captacao_mixmaster' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">3h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora de Início:</span>
                <span className="font-medium">
                  {selectedSlot?.start_time.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora de Fim:</span>
                <span className="font-medium">
                  {reservationFromOffer
                    ? calculateEndTime(selectedSlot?.start_time || '', 180).slice(0, 5)
                    : selectedService === 'captacao' 
                    ? calculateEndTime(selectedSlot?.start_time || '', selectedHours * 60).slice(0, 5)
                    : selectedService === 'captacao_mixmaster'
                    ? calculateEndTime(selectedSlot?.start_time || '', 180).slice(0, 5)
                    : selectedSlot?.end_time.slice(0, 5)
                  }
                </span>
              </div>
              {reservationFromOffer && (
                <div className="flex justify-between border-t pt-3 mt-3">
                  <span className="text-muted-foreground font-semibold">Preço Total:</span>
                  <span className="font-bold text-primary">
                    €{reservationFromOffer.price_eur_snapshot}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <PriceSummary
            services={selectedServiceDetails ? [selectedServiceDetails] : []}
            bookingDate={selectedDate || undefined}
            showFriendCode={false}
          />

          <div className="space-y-3">
            <Button 
              onClick={() => {
                if (!selectedService || !selectedDate || !selectedSlot || !selectedBackendServiceId) return;

                // Se é oferta, parar o timer
                if (reservationFromOffer && timerIntervalRef.current) {
                  clearInterval(timerIntervalRef.current);
                  timerIntervalRef.current = null;
                  setTimeLeft(null);
                }

                const serviceName = services.find(s => s.id === selectedService)?.name || 'Serviço';
                const bookingPrice = selectedService === 'captacao' ? getRecordingPrice() : selectedServiceDetails?.base_price || 0;
                
                // Navigate to payment with backend service ID
                const queryParams = new URLSearchParams({
                  service: 'booking',
                  option: selectedService,
                  delivery: 'in-person',
                  price: bookingPrice.toString(),
                  notes: `${serviceName} - ${format(selectedDate, 'dd/MM/yyyy')} às ${selectedSlot.start_time}`,
                  date: format(selectedDate, 'yyyy-MM-dd'),
                  start_time: selectedSlot.start_time,
                  end_time: selectedSlot.end_time,
                  service_id: selectedBackendServiceId, // Use backend service ID
                  hours: selectedService === 'captacao' ? selectedHours.toString() : undefined,
                  reservation_id: reservationFromOffer?.id, // Incluir reservation_id se for oferta
                });
                navigate(`/payment?${queryParams.toString()}`);
              }}
              className="w-full"
              disabled={loading}
            >
              {reservationFromOffer ? 'Já Paguei' : 'Ir para Pagamento'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {reservationFromOffer ? 'Clica aqui após fazeres o pagamento.' : 'Será redirecionado para a página de pagamento.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const BookWithSync = () => (
  <RealtimeSyncProvider>
    <Book />
  </RealtimeSyncProvider>
);

export default BookWithSync;