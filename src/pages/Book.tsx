import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBooking } from '@/hooks/useBooking';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import PriceSummary from '@/components/PriceSummary';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    services,
    loading,
    isDateAvailable,
    generateTimeSlots,
    fetchBookingsForDate,
    createBooking,
    sendBookingMessage,
    generateWhatsAppLink,
  } = useBooking();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [whatsAppLink, setWhatsAppLink] = useState<string>('');

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setStep(2);
  };

  // Handle date selection
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    await fetchBookingsForDate(date);
    const slots = generateTimeSlots(date);
    setTimeSlots(slots);
    setStep(3);
  };

  // Handle time slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    
    setSelectedSlot(slot);
    setStep(4);
  };

  // Handle booking confirmation
  const handleBookingConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    try {
      await createBooking(
        selectedService,
        selectedDate,
        selectedSlot.start_time,
        selectedSlot.end_time
      );

      // Send in-app message
      await sendBookingMessage(
        selectedService,
        selectedDate,
        selectedSlot.start_time
      );

      // Generate WhatsApp link
      const link = generateWhatsAppLink(
        selectedService,
        selectedDate,
        selectedSlot.start_time
      );
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
  };

  // Get selected service details
  const selectedServiceDetails = services.find(s => s.id === selectedService);

  if (bookingComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="neon-heading">
            Reserva Confirmada!
          </h1>
          <p className="text-muted-foreground">
            A sua sessão foi reservada com sucesso
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Detalhes da Sessão</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium">Serviço:</span> {selectedServiceDetails?.name}</p>
                <p><span className="font-medium">Data:</span> {selectedDate && format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
                <p><span className="font-medium">Horário:</span> {selectedSlot && format(parse(selectedSlot.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - {selectedSlot && format(parse(selectedSlot.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}</p>
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
                Os detalhes da sessão também foram enviados para as suas Mensagens
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
          Agende a sua sessão de gravação em alguns passos simples
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
          <h2 className="text-xl font-semibold text-center">Escolha o Seu Serviço</h2>
          <div className="space-y-3">
            {services.map((service) => (
              <Card
                key={service.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleServiceSelect(service.id)}
              >
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
                    <p className="font-semibold text-primary">${service.base_price}</p>
                    <Badge variant="secondary" className="text-xs">
                      {service.type}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
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
              disabled={(date) => !isDateAvailable(date)}
              className="rounded-md border pointer-events-auto"
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Apenas datas disponíveis são seleccionáveis
          </p>
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
              {selectedDate && format(selectedDate, 'EEEE, MMMM do, yyyy')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {timeSlots.map((slot, index) => (
              <Button
                key={index}
                variant={slot.available ? "outline" : "ghost"}
                disabled={!slot.available}
                onClick={() => handleSlotSelect(slot)}
                className={cn(
                  "h-12 flex flex-col items-center justify-center",
                  !slot.available && "opacity-50 cursor-not-allowed"
                )}
              >
                <Clock className="w-4 h-4 mb-1" />
                <span className="text-xs">
                  {format(parse(slot.start_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                </span>
              </Button>
            ))}
          </div>

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
                <span className="font-medium">{selectedServiceDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM do, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">
                  {selectedSlot && format(parse(selectedSlot.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - {selectedSlot && format(parse(selectedSlot.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                </span>
              </div>
            </div>
          </Card>

          <PriceSummary 
            services={selectedServiceDetails ? [selectedServiceDetails] : []}
            bookingDate={selectedDate || undefined}
          />

          <div className="space-y-3">
            <Button 
              onClick={handleBookingConfirm} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'A confirmar...' : 'Confirmar Reserva'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Não é necessário pagamento agora. O pagamento será processado no estúdio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Book;