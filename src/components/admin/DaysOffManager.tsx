import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DayOff {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
}

export const DaysOffManager = () => {
  const { toast } = useToast();
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [reason, setReason] = useState('');

  const loadDaysOff = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_days_off' as any)
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setDaysOff((data as any) || []);
    } catch (error) {
      console.error('Error loading days off:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dias de folga',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadDaysOff();
  }, []);

  const handleMarkOff = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Erro',
        description: 'Seleciona as datas de início e fim',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date with time
      const startDateTime = new Date(startDate);
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(endDate);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const { error } = await supabase.rpc('admin_mark_day_off' as any, {
        p_start_date: startDateTime.toISOString(),
        p_end_date: endDateTime.toISOString(),
        p_reason: reason || null,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Dia(s) de folga marcado(s) com sucesso',
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setStartTime('10:00');
      setEndTime('22:00');

      // Reload list
      loadDaysOff();
    } catch (error: any) {
      console.error('Error marking day off:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível marcar o dia de folga',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (id: string) => {
    if (!confirm('Tens a certeza que queres reverter este dia de folga?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_revert_day_off' as any, {
        p_id: id,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Dia de folga revertido',
      });

      loadDaysOff();
    } catch (error: any) {
      console.error('Error reverting day off:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reverter o dia de folga',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mark Day Off Form */}
      <Card>
        <CardHeader>
          <CardTitle>Marcar Dia de Folga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: pt }) : 'Seleciona a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label>Hora de Início</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP', { locale: pt }) : 'Seleciona a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label>Hora de Fim</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Input
              placeholder="Ex: Férias, Feriado, Manutenção..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleMarkOff} 
            disabled={loading || !startDate || !endDate}
            className="w-full"
          >
            {loading ? 'A processar...' : 'Marcar Dia de Folga'}
          </Button>
        </CardContent>
      </Card>

      {/* Days Off List */}
      <Card>
        <CardHeader>
          <CardTitle>Dias de Folga Marcados</CardTitle>
        </CardHeader>
        <CardContent>
          {daysOff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-2" />
              <p>Nenhum dia de folga marcado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora de Início</TableHead>
                  <TableHead>Data/Hora de Fim</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daysOff.map((dayOff) => (
                  <TableRow key={dayOff.id}>
                    <TableCell>
                      {format(new Date(dayOff.start_date), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(dayOff.end_date), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </TableCell>
                    <TableCell>{dayOff.reason || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={dayOff.is_active ? 'default' : 'secondary'}>
                        {dayOff.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {dayOff.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevert(dayOff.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
