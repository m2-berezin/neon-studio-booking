import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Check, X, Plus } from 'lucide-react';

export const AvailabilityManagement = () => {
  const {
    DEFAULT_TIME_SLOTS,
    getAvailabilityForDate,
    toggleAvailability,
    createAvailabilitiesForDate
  } = useAvailabilities();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateChange = (date: Date | Date[]) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
  };

  const dateAvailabilities = getAvailabilityForDate(selectedDate);

  const isSlotAvailable = (timeSlot: string) => {
    const slot = dateAvailabilities.find(a => a.time_slot === timeSlot);
    return slot?.is_available || false;
  };

  const hasSlot = (timeSlot: string) => {
    return dateAvailabilities.some(a => a.time_slot === timeSlot);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerir Disponibilidades</CardTitle>
          <CardDescription>
            Selecione uma data e marque os horários como disponíveis ou indisponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="flex flex-col items-center">
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                minDate={new Date()}
                locale="pt-PT"
                className="rounded-lg border"
              />
              <Button
                onClick={() => createAvailabilitiesForDate(selectedDate)}
                className="mt-4 w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Horários para esta Data
              </Button>
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="font-semibold mb-4">
                Horários para {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </h3>
              <div className="space-y-2">
                {DEFAULT_TIME_SLOTS.map(slot => {
                  const available = isSlotAvailable(slot);
                  const exists = hasSlot(slot);

                  return (
                    <div
                      key={slot}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        exists
                          ? available
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <span className="font-medium">{slot.substring(0, 5)}</span>
                      <Button
                        size="sm"
                        variant={available ? 'destructive' : 'default'}
                        onClick={() => toggleAvailability(selectedDate, slot)}
                      >
                        {exists ? (
                          available ? (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Marcar Indisponível
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Marcar Disponível
                            </>
                          )
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Criar Horário
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
