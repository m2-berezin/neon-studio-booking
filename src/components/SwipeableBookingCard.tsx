import { useState } from 'react';
import { Calendar, Clock, Euro, User, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSwipeable } from 'react-swipeable';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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

interface SwipeableBookingCardProps {
  booking: BookingWithProfile;
  onStatusChange: (bookingId: string, newStatus: string) => void;
  onMoveToRetained: (bookingId: string) => void;
  calculateBookingRevenue: (booking: BookingWithProfile) => number;
  formatPrice: (price: number) => string;
  getStatusLabel: (status: string) => string;
  showMoveButton: boolean;
}

export const SwipeableBookingCard = ({
  booking,
  onStatusChange,
  onMoveToRetained,
  calculateBookingRevenue,
  formatPrice,
  getStatusLabel,
  showMoveButton,
}: SwipeableBookingCardProps) => {
  const [isSwiped, setIsSwiped] = useState(false);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (showMoveButton) {
        setIsSwiped(true);
      }
    },
    onSwipedRight: () => setIsSwiped(false),
    trackMouse: true,
    trackTouch: true,
  });

  return (
    <div className="relative overflow-hidden" {...swipeHandlers}>
      {/* Background action button */}
      {isSwiped && showMoveButton && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end bg-accent px-4">
          <Button
            onClick={() => {
              onMoveToRetained(booking.id);
              setIsSwiped(false);
            }}
            className="gap-2 bg-accent hover:bg-accent/90 text-white"
          >
            <MoveRight className="h-4 w-4" />
            Mover
          </Button>
        </div>
      )}
      
      {/* Main card content */}
      <div 
        className="studio-card transition-transform duration-300"
        style={{
          transform: isSwiped ? 'translateX(-100px)' : 'translateX(0)',
        }}
      >
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
              onValueChange={(value) => onStatusChange(booking.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {getStatusLabel(booking.status)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                {showMoveButton && <SelectItem value="cancelled">Cancelado</SelectItem>}
                {!showMoveButton && <SelectItem value="confirmed">Confirmado</SelectItem>}
                {!showMoveButton && <SelectItem value="cancelled">Cancelado</SelectItem>}
                <SelectItem value="deleted">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
