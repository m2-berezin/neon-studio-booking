import { useNavigate } from 'react-router-dom';
import ServiceCard from '@/components/ServiceCard';
import { 
  Calendar, 
  Music, 
  FolderOpen, 
  Gift, 
  CreditCard, 
  MapPin 
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const services = [
    {
      title: 'Book a Session',
      description: 'Schedule your recording session with our professional engineers',
      icon: Calendar,
      path: '/book',
      gradient: true,
    },
    {
      title: 'Exclusive Beats',
      description: 'Browse our collection of premium beats and instrumentals',
      icon: Music,
      path: '/beats',
    },
    {
      title: 'My Projects',
      description: 'Access your recordings, mixes, and project files',
      icon: FolderOpen,
      path: '/projects',
    },
    {
      title: 'Rewards',
      description: 'Earn points and unlock exclusive perks and discounts',
      icon: Gift,
      path: '/rewards',
      gradient: true,
    },
    {
      title: 'Subscriptions',
      description: 'Manage your studio membership and billing',
      icon: CreditCard,
      path: '/subscriptions',
    },
    {
      title: 'Studio Info',
      description: 'Location, hours, equipment specs, and contact information',
      icon: MapPin,
      path: '/studio-info',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to the Studio
        </h2>
        <p className="text-muted-foreground">
          Professional music production at your fingertips
        </p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.title}
            title={service.title}
            description={service.description}
            icon={service.icon}
            gradient={service.gradient}
            onClick={() => navigate(service.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Home;