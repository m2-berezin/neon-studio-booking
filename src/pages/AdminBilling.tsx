import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Euro, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BookingWithProfile {
  id: string;
  starts_at: string;
  ends_at: string;
  price_eur_snapshot: number;
  service_name_snapshot: string;
  user_id: string;
  status: string;
  profiles: {
    full_name: string;
  };
}

const AdminBilling = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingWithProfile[]>([]);
  const [allBookings, setAllBookings] = useState<BookingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // First, fetch all bookings (any status) that are not hidden from admin
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, starts_at, ends_at, price_eur_snapshot, service_name_snapshot, user_id, status, hidden_from_admin')
          .eq('hidden_from_admin', false)
          .order('starts_at', { ascending: false });

        if (bookingsError) throw bookingsError;

        // Then, fetch profile names for each booking
        const bookingsWithProfiles = await Promise.all(
          (bookingsData || []).map(async (booking) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', booking.user_id)
              .single();

            return {
              ...booking,
              profiles: {
                full_name: profile?.full_name || 'Cliente Desconhecido'
              }
            };
          })
        );

        setAllBookings(bookingsWithProfiles);
        setBookings(bookingsWithProfiles);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Calculate revenue based on booking status
  const calculateBookingRevenue = (booking: BookingWithProfile) => {
    if (booking.status === 'deposit_retained') {
      return 15; // Fixed 15€ for deposit retained
    } else if (booking.status === 'cancelled') {
      return 0; // No revenue for cancelled
    } else {
      return booking.price_eur_snapshot || 0; // Full price for confirmed
    }
  };

  // Filter bookings when month/year changes
  useEffect(() => {
    // Calculate total revenue from all bookings based on status
    const total = allBookings.reduce(
      (sum, booking) => sum + calculateBookingRevenue(booking),
      0
    );
    setTotalRevenue(total);

    if (!selectedMonth || !selectedYear) {
      setBookings(allBookings);
      setMonthlyRevenue(0);
      return;
    }

    const monthNum = parseInt(selectedMonth);
    const yearNum = parseInt(selectedYear);
    
    const filtered = allBookings.filter(booking => {
      const bookingDate = new Date(booking.starts_at);
      return bookingDate.getMonth() + 1 === monthNum && bookingDate.getFullYear() === yearNum;
    });

    setBookings(filtered);
    
    const monthly = filtered.reduce(
      (sum, booking) => sum + calculateBookingRevenue(booking),
      0
    );
    setMonthlyRevenue(monthly);
  }, [selectedMonth, selectedYear, allBookings]);

  const handleClearFilter = () => {
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  // Generate available years (from 2025 to current year + 1)
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const endYear = Math.max(currentYear + 1, startYear);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => (startYear + i).toString());
  
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      if (newStatus === 'deleted') {
        // Hide booking from admin view
        const { error } = await supabase
          .from('bookings')
          .update({ hidden_from_admin: true })
          .eq('id', bookingId);

        if (error) throw error;

        // Remove from local state
        const updatedAllBookings = allBookings.filter(b => b.id !== bookingId);
        setAllBookings(updatedAllBookings);
        
        const updatedBookings = bookings.filter(b => b.id !== bookingId);
        setBookings(updatedBookings);
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);

        if (error) throw error;

        // Update local state
        const updatedAllBookings = allBookings.map(b => 
          b.id === bookingId ? { ...b, status: newStatus } : b
        );
        setAllBookings(updatedAllBookings);
        
        const updatedBookings = bookings.map(b => 
          b.id === bookingId ? { ...b, status: newStatus } : b
        );
        setBookings(updatedBookings);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'confirmed': 'Confirmado',
      'deposit_retained': 'Sinal Retido',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || 'Confirmado';
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Faturação Total
        </h1>
        <p className="text-muted-foreground mb-4">
          Histórico de {selectedMonth && selectedYear ? 'reservas do período selecionado' : 'todas as reservas confirmadas'}
        </p>
        
        {/* Revenue Cards */}
        <div className="max-w-md mx-auto space-y-4 mb-6">
          {selectedMonth && selectedYear && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Receita Mensal - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 text-3xl font-bold text-accent">
                  <Euro className="h-8 w-8" />
                  <span>{formatPrice(monthlyRevenue)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {bookings.length} {bookings.length === 1 ? 'sessão confirmada' : 'sessões confirmadas'}
                </p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-accent">
                <Euro className="h-8 w-8" />
                <span>{formatPrice(totalRevenue)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {allBookings.length} {allBookings.length === 1 ? 'sessão confirmada' : 'sessões confirmadas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Month/Year Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Select value={selectedMonth || ''} onValueChange={(value) => setSelectedMonth(value || null)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear || ''} onValueChange={(value) => setSelectedYear(value || null)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Selecionar ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedMonth || selectedYear) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilter}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="studio-card text-center">
          <p className="text-muted-foreground">
            Ainda não há reservas confirmadas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="studio-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <User className="h-4 w-4 text-accent flex-shrink-0" />
                    <span className="text-accent font-semibold">
                      {booking.profiles.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground font-medium">
                      {format(new Date(booking.starts_at), 'dd/MM/yyyy', { locale: pt })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {format(new Date(booking.starts_at), 'HH:mm')} - {format(new Date(booking.ends_at), 'HH:mm')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {booking.service_name_snapshot}
                  </div>
                  <div className="flex items-center gap-1 text-accent font-semibold pt-2">
                    <Euro className="h-4 w-4" />
                    <span>{formatPrice(calculateBookingRevenue(booking))}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 min-w-[180px]">
                  <Select 
                    value={booking.status} 
                    onValueChange={(value) => handleStatusChange(booking.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="deposit_retained">Sinal Retido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="deleted">Eliminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBilling;
