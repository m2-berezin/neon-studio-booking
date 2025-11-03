import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Euro, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingWithProfile {
  id: string;
  starts_at: string;
  ends_at: string;
  price_eur_snapshot: number;
  service_name_snapshot: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

const AdminBilling = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
        // First, fetch all confirmed bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, starts_at, ends_at, price_eur_snapshot, service_name_snapshot, user_id')
          .eq('status', 'confirmed')
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

        setBookings(bookingsWithProfiles);

        // Calculate total revenue
        const total = bookingsWithProfiles.reduce(
          (sum, booking) => sum + (booking.price_eur_snapshot || 0),
          0
        );
        setTotalRevenue(total);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
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
          Histórico de todas as reservas confirmadas
        </p>
        
        {/* Total Revenue Card */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-accent">
              <Euro className="h-8 w-8" />
              <span>{formatPrice(totalRevenue)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {bookings.length} {bookings.length === 1 ? 'sessão confirmada' : 'sessões confirmadas'}
            </p>
          </CardContent>
        </Card>
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
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
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
                  </div>
                  <div className="flex items-center gap-1 text-accent font-semibold whitespace-nowrap">
                    <Euro className="h-4 w-4" />
                    <span>{formatPrice(booking.price_eur_snapshot || 0)}</span>
                  </div>
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
