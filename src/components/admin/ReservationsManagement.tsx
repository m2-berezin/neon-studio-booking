import { useReservationsWithDetails } from '@/hooks/useReservationsWithDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Check, X, Loader2 } from 'lucide-react';

export const ReservationsManagement = () => {
  const { reservations, loading, updateReservationStatus } = useReservationsWithDetails();

  const pendingReservations = reservations.filter(r => r.status === 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApprove = async (reservationId: string) => {
    await updateReservationStatus(reservationId, 'confirmed');
  };

  const handleReject = async (reservationId: string) => {
    await updateReservationStatus(reservationId, 'cancelled');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Reservas Pendentes</CardTitle>
          <CardDescription>
            Reservas aguardando aprovação de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReservations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.user_name || 'N/A'}
                    </TableCell>
                    <TableCell>{reservation.service_name || 'N/A'}</TableCell>
                    <TableCell>{reservation.duration}h</TableCell>
                    <TableCell>
                      {format(new Date(reservation.date), "d 'de' MMMM", { locale: pt })}
                    </TableCell>
                    <TableCell>{reservation.time_slot.substring(0, 5)}</TableCell>
                    <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(reservation.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(reservation.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Não há reservas pendentes
            </p>
          )}
        </CardContent>
      </Card>

      {/* All Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Reservas</CardTitle>
          <CardDescription>Histórico completo de reservas</CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.user_name || 'N/A'}
                    </TableCell>
                    <TableCell>{reservation.service_name || 'N/A'}</TableCell>
                    <TableCell>{reservation.duration}h</TableCell>
                    <TableCell>
                      {format(new Date(reservation.date), "d 'de' MMMM", { locale: pt })}
                    </TableCell>
                    <TableCell>{reservation.time_slot.substring(0, 5)}</TableCell>
                    <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Não há reservas registadas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
