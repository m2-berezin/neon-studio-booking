import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Euro, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SwipeableBookingCard } from '@/components/SwipeableBookingCard';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('faturacao');

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
              status: booking.status || 'confirmed', // Default to confirmed if no status
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

  // Filter bookings by active tab
  const filteredBookingsByTab = activeTab === 'retidos' 
    ? bookings.filter(b => b.status === 'deposit_retained')
    : bookings.filter(b => b.status !== 'deposit_retained');

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
    if (newStatus === 'deleted') {
      setBookingToDelete(bookingId);
      setDeleteDialogOpen(true);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleMoveToRetained = async (bookingId: string) => {
    await handleStatusChange(bookingId, 'deposit_retained');
  };

  const confirmDelete = async () => {
    if (!bookingToDelete) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ hidden_from_admin: true })
        .eq('id', bookingToDelete);

      if (error) throw error;

      // Remove from local state
      const updatedAllBookings = allBookings.filter(b => b.id !== bookingToDelete);
      setAllBookings(updatedAllBookings);
      
      const updatedBookings = bookings.filter(b => b.id !== bookingToDelete);
      setBookings(updatedBookings);
      
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'confirmed': 'Confirmado',
      'deposit_retained': 'Retido (15€)',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || 'Confirmado';
  };

  // Calculate revenue for current tab
  const currentTabRevenue = filteredBookingsByTab.reduce(
    (sum, booking) => sum + calculateBookingRevenue(booking),
    0
  );

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="faturacao">Faturação</TabsTrigger>
          <TabsTrigger value="retidos">Retidos</TabsTrigger>
        </TabsList>

        <TabsContent value="faturacao">
          {loading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookingsByTab.length === 0 ? (
            <div className="studio-card text-center">
              <p className="text-muted-foreground">
                Ainda não há reservas nesta categoria.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <Card className="max-w-md mx-auto">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-accent">
                      <Euro className="h-6 w-6" />
                      <span>{formatPrice(currentTabRevenue)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {filteredBookingsByTab.length} {filteredBookingsByTab.length === 1 ? 'sessão' : 'sessões'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                {filteredBookingsByTab.map((booking) => (
                  <SwipeableBookingCard
                    key={booking.id}
                    booking={booking}
                    onStatusChange={handleStatusChange}
                    onMoveToRetained={handleMoveToRetained}
                    calculateBookingRevenue={calculateBookingRevenue}
                    formatPrice={formatPrice}
                    getStatusLabel={getStatusLabel}
                    showMoveButton={true}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="retidos">
          {loading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookingsByTab.length === 0 ? (
            <div className="studio-card text-center">
              <p className="text-muted-foreground">
                Ainda não há sinais retidos.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <Card className="max-w-md mx-auto">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-accent">
                      <Euro className="h-6 w-6" />
                      <span>{formatPrice(currentTabRevenue)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {filteredBookingsByTab.length} {filteredBookingsByTab.length === 1 ? 'sinal retido' : 'sinais retidos'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                {filteredBookingsByTab.map((booking) => (
                  <SwipeableBookingCard
                    key={booking.id}
                    booking={booking}
                    onStatusChange={handleStatusChange}
                    onMoveToRetained={handleMoveToRetained}
                    calculateBookingRevenue={calculateBookingRevenue}
                    formatPrice={formatPrice}
                    getStatusLabel={getStatusLabel}
                    showMoveButton={false}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tens a certeza que pretendes eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a sessão da lista de faturação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBilling;
