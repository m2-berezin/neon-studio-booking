import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Booking {
  id: string;
  starts_at: string;
  ends_at: string;
  price_eur_snapshot: number;
  service_name_snapshot: string;
}

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, starts_at, ends_at, price_eur_snapshot, service_name_snapshot')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .order('starts_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Faturação
        </h1>
        <p className="text-muted-foreground">
          Histórico de reservas confirmadas
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="studio-card text-center">
          <p className="text-muted-foreground">
            Ainda não tens reservas confirmadas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="studio-card">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
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

export default Billing;
