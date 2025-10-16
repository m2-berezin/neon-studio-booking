import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Clock, User, AlertTriangle, Edit, Shield, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatPrice } from '@/lib/utils';

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
  service_name_snapshot: string;
  price_eur_snapshot: number;
}

const AdminBookings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Enable realtime sync for admin
  useRealtimeSync(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToHide, setBookingToHide] = useState<string | null>(null);

  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    completed: 'bg-green-500',
    no_show: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Concluída' },
    { value: 'no_show', label: 'Não Compareceu' },
    { value: 'cancelled', label: 'Cancelada' },
  ];

  const loadAllBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('hidden_from_admin', false)
        .order('starts_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);
      
      // Add client names to bookings
      const bookingsWithNames = (data || []).map(b => ({
        ...b,
        client_name: profilesMap.get(b.user_id) || 'Cliente Desconhecido'
      }));
      
      setBookings(bookingsWithNames as any);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as reservas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      toast({
        title: 'Status Atualizado',
        description: 'O status da reserva foi atualizado com sucesso.',
      });

      await loadAllBookings();
      setDialogOpen(false);
      setSelectedBooking(null);
      setNewStatus('');
    } catch (error) {
      console.error('Failed to update booking:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setDialogOpen(true);
  };

  const handleHideBooking = async () => {
    if (!bookingToHide) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ hidden_from_admin: true })
        .eq('id', bookingToHide);

      if (error) throw error;

      toast({
        title: 'Reserva Removida',
        description: 'A reserva foi removida do teu dashboard.',
      });

      await loadAllBookings();
    } catch (error) {
      console.error('Error hiding booking:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a reserva',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setBookingToHide(null);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllBookings();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso de Admin Necessário</h2>
        <p className="text-muted-foreground">Precisas de privilégios de administrador para ver esta página.</p>
      </div>
    );
  }

  const exportToCSV = () => {
    const csvData = bookings.map((booking: any) => ({
      Cliente: booking.client_name,
      Serviço: booking.service_name_snapshot,
      Data: format(new Date(booking.starts_at), 'dd/MM/yyyy'),
      Hora_Início: format(new Date(booking.starts_at), 'HH:mm'),
      Hora_Fim: format(new Date(booking.ends_at), 'HH:mm'),
      Status: booking.status,
      Preço: `€${booking.price_eur_snapshot}`,
      Data_Reserva: format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm'),
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exportado com Sucesso',
      description: 'As reservas foram exportadas para CSV',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerir Reservas</h1>
          <p className="text-muted-foreground">
            Veja e gira todas as reservas do estúdio
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          Exportar CSV
        </Button>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Sem Reservas</h3>
            <p className="text-muted-foreground">Não há reservas para exibir.</p>
          </div>
        ) : (
          bookings.map((booking: any) => (
            <Card key={booking.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge 
                      className={`${statusColors[booking.status as keyof typeof statusColors]} text-white`}
                    >
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{booking.client_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.service_name_snapshot} - {formatPrice(booking.price_eur_snapshot)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(booking.starts_at), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(new Date(booking.starts_at), 'HH:mm')} - {format(new Date(booking.ends_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Reservado: {format(new Date(booking.created_at), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(booking)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setBookingToHide(booking.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status da Reserva</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{(selectedBooking as any).client_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.service_name_snapshot} - {format(new Date(selectedBooking.starts_at), 'dd/MM/yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedBooking.starts_at), 'HH:mm')} - {format(new Date(selectedBooking.ends_at), 'HH:mm')}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleStatusUpdate} disabled={loading} className="flex-1">
                  {loading ? 'Atualizando...' : 'Atualizar Status'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Reserva do Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              A reserva será removida apenas do teu dashboard. O cliente continuará a vê-la e a receita mensal não será afetada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleHideBooking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBookings;