import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

interface TimeBlock {
  id: string;
  start_date: string;
  end_date: string;
  blocked_start_time: string;
  blocked_end_time: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
}

export const DaysOffManager = () => {
  const { toast } = useToast();
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for days off
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [reason, setReason] = useState('');
  
  // Form state for time blocks
  const [blockStartDate, setBlockStartDate] = useState<Date>();
  const [blockEndDate, setBlockEndDate] = useState<Date>();
  const [blockStartTime, setBlockStartTime] = useState('10:00');
  const [blockEndTime, setBlockEndTime] = useState('13:00');
  const [blockReason, setBlockReason] = useState('');

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

  const loadTimeBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('temporary_time_blocks' as any)
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTimeBlocks((data as any) || []);
    } catch (error) {
      console.error('Error loading time blocks:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os horários temporários',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadDaysOff();
    loadTimeBlocks();
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

  const handleCreateTimeBlock = async () => {
    if (!blockStartDate || !blockEndDate) {
      toast({
        title: 'Erro',
        description: 'Seleciona as datas de início e fim',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_create_time_block' as any, {
        p_start_date: format(blockStartDate, 'yyyy-MM-dd'),
        p_end_date: format(blockEndDate, 'yyyy-MM-dd'),
        p_blocked_start_time: blockStartTime,
        p_blocked_end_time: blockEndTime,
        p_reason: blockReason || null,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Horário temporário criado com sucesso',
      });

      // Reset form
      setBlockStartDate(undefined);
      setBlockEndDate(undefined);
      setBlockReason('');
      setBlockStartTime('10:00');
      setBlockEndTime('13:00');

      // Reload list
      loadTimeBlocks();
    } catch (error: any) {
      console.error('Error creating time block:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o horário temporário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeBlock = async (id: string) => {
    if (!confirm('Tens a certeza que queres eliminar este horário temporário?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_delete_time_block' as any, {
        p_id: id,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Horário temporário eliminado',
      });

      loadTimeBlocks();
    } catch (error: any) {
      console.error('Error deleting time block:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível eliminar o horário temporário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mark Day Off Form */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="day-off">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-lg">Marcar Dia de Folga</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
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
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Temporary Time Blocks Form */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="time-block">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-lg">Horário Temporário</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
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
                            !blockStartDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {blockStartDate ? format(blockStartDate, 'PPP', { locale: pt }) : 'Seleciona a data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={blockStartDate}
                          onSelect={setBlockStartDate}
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
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
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
                            !blockEndDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {blockEndDate ? format(blockEndDate, 'PPP', { locale: pt }) : 'Seleciona a data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={blockEndDate}
                          onSelect={setBlockEndDate}
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
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    placeholder="Ex: Reunião, Pausa almoço, Indisponibilidade temporária..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleCreateTimeBlock} 
                  disabled={loading || !blockStartDate || !blockEndDate}
                  className="w-full"
                >
                  {loading ? 'A processar...' : 'Criar Horário Temporário'}
                </Button>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Time Blocks List */}
      <Card>
        <CardHeader>
          <CardTitle>Horários Temporários Criados</CardTitle>
        </CardHeader>
        <CardContent>
          {timeBlocks.filter(block => block.is_active).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-2" />
              <p>Nenhum horário temporário criado</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Horas Bloqueadas</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeBlocks.filter(block => block.is_active).map((block) => (
                      <TableRow key={block.id}>
                        <TableCell>
                          {format(new Date(block.start_date), 'dd/MM/yyyy', { locale: pt })} - {format(new Date(block.end_date), 'dd/MM/yyyy', { locale: pt })}
                        </TableCell>
                        <TableCell>
                          {block.blocked_start_time.substring(0, 5)} - {block.blocked_end_time.substring(0, 5)}
                        </TableCell>
                        <TableCell>{block.reason || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={block.is_active ? 'default' : 'secondary'}>
                            {block.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {block.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTimeBlock(block.id)}
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
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {timeBlocks.filter(block => block.is_active).map((block) => (
                  <Card key={block.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="text-sm font-medium">Período</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(block.start_date), 'dd/MM/yyyy', { locale: pt })} - {format(new Date(block.end_date), 'dd/MM/yyyy', { locale: pt })}
                          </div>
                        </div>
                        <Badge variant={block.is_active ? 'default' : 'secondary'}>
                          {block.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Horas Bloqueadas</div>
                        <div className="text-sm text-muted-foreground">
                          {block.blocked_start_time.substring(0, 5)} - {block.blocked_end_time.substring(0, 5)}
                        </div>
                      </div>

                      {block.reason && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Motivo</div>
                          <div className="text-sm text-muted-foreground">{block.reason}</div>
                        </div>
                      )}

                      {block.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTimeBlock(block.id)}
                          disabled={loading}
                          className="w-full mt-2"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Days Off List */}
      <Card>
        <CardHeader>
          <CardTitle>Dias de Folga Marcados</CardTitle>
        </CardHeader>
        <CardContent>
          {daysOff.filter(day => day.is_active).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-2" />
              <p>Nenhum dia de folga marcado</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
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
                    {daysOff.filter(day => day.is_active).map((dayOff) => (
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
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {daysOff.filter(day => day.is_active).map((dayOff) => (
                  <Card key={dayOff.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="text-sm font-medium">Início</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(dayOff.start_date), 'dd/MM/yyyy HH:mm', { locale: pt })}
                          </div>
                        </div>
                        <Badge variant={dayOff.is_active ? 'default' : 'secondary'}>
                          {dayOff.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Fim</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(dayOff.end_date), 'dd/MM/yyyy HH:mm', { locale: pt })}
                        </div>
                      </div>

                      {dayOff.reason && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Motivo</div>
                          <div className="text-sm text-muted-foreground">{dayOff.reason}</div>
                        </div>
                      )}

                      {dayOff.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevert(dayOff.id)}
                          disabled={loading}
                          className="w-full mt-2"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reverter
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
