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
      title: 'Reservar Sessão',
      description: 'Agenda a tua sessão de estúdio',
      icon: Calendar,
      path: '/book',
      gradient: true,
    },
    {
      title: 'Mix & Master',
      description: 'Envia os teus projetos',
      icon: Music,
      path: '/mix-master',
      gradient: true,
    },
    {
      title: 'Beats Exclusivos',
      description: 'Beats personalizados premium criados exclusivamente para ti',
      icon: Music,
      path: '/beats',
      gradient: true,
    },
    {
      title: 'Subscrições',
      description: 'Poupe com os nossos planos de subscrição',
      icon: CreditCard,
      path: '/subscriptions',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Welcome Section */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto w-full">
          <div className="mb-12">
            <h1 className="neon-heading mb-8">
              Bem-vindo ao Estúdio
            </h1>
          </div>

          {/* Service Cards Grid - Symmetrical Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
      </div>
    </div>
  );
};

export default Home;