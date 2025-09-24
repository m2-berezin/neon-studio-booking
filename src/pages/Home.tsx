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
        <h1 className="neon-heading">
          Welcome to the Studio
        </h1>
        <p className="text-muted-foreground text-lg mt-4">
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