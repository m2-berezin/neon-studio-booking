import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse } from 'date-fns';
import { Calendar, Clock, User, AlertTriangle, Edit, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  services: {
    name: string;
    base_price: number;
  };
}

const AdminBookings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { loading, updateBookingStatus, loadBookings, bookings } = useAdmin();
  const [localBookings, setLocalBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

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
    await loadBookings();
  };

  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      await updateBookingStatus(selectedBooking.id, newStatus);
      await loadAllBookings(); // Refresh the list
      setDialogOpen(false);
      setSelectedBooking(null);
      setNewStatus('');
      setNotes('');
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const openEditDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setNotes(booking.notes || '');
    setDialogOpen(true);
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
    const csvData = bookings.map(booking => ({
      Cliente: booking.profiles.full_name,
      Serviço: booking.services.name,
      Data: format(new Date(booking.date), 'dd/MM/yyyy'),
      Hora_Início: booking.start_time,
      Hora_Fim: booking.end_time,
      Status: booking.status,
      Preço: `€${booking.services.base_price}`,
      Notas: booking.notes || '',
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No Bookings Found</h3>
            <p className="text-muted-foreground">There are no bookings to display.</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge 
                      className={`${statusColors[booking.status as keyof typeof statusColors]} text-white`}
                    >
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {booking.status === 'no_show' && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Penalty Applied</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{booking.profiles.full_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.services.name} - €{booking.services.base_price}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(booking.date), 'EEEE, MMM do, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(parse(booking.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - 
                          {format(parse(booking.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Booked: {format(new Date(booking.created_at), 'MMM do, yyyy')}
                      </div>
                      {booking.notes && (
                        <div className="text-sm text-muted-foreground">
                          Notes: {booking.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(booking)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
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
            <DialogTitle>Update Booking Status</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedBooking.profiles.full_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedBooking.services.name} - {format(new Date(selectedBooking.date), 'EEEE, MMM do, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(parse(selectedBooking.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - 
                  {format(parse(selectedBooking.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
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
                        {option.value === 'no_show' && (
                          <span className="ml-2 text-destructive text-xs">(Applies 3-month penalty)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this booking..."
                  rows={3}
                />
              </div>

              {newStatus === 'no_show' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Penalty Warning</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    Setting status to "No Show" will apply a 3-month penalty to this client, 
                    preventing them from redeeming rewards until the penalty expires.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleStatusUpdate} disabled={loading} className="flex-1">
                  {loading ? 'Updating...' : 'Update Status'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;