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
      description: 'Agende a sua sessão de gravação com os nossos engenheiros profissionais',
      icon: Calendar,
      path: '/book',
      gradient: true,
    },
    {
      title: 'Beats Exclusivos',
      description: 'Explore a nossa colecção de beats premium e instrumentais',
      icon: Music,
      path: '/beats',
    },
    {
      title: 'Os Meus Projectos',
      description: 'Aceda às suas gravações, misturas e ficheiros de projectos',
      icon: FolderOpen,
      path: '/projects',
    },
    {
      title: 'Recompensas',
      description: 'Ganhe pontos e desbloqueie vantagens e descontos exclusivos',
      icon: Gift,
      path: '/rewards',
      gradient: true,
    },
    {
      title: 'Subscrições',
      description: 'Gerencie a sua afiliação no estúdio e facturação',
      icon: CreditCard,
      path: '/subscriptions',
    },
    {
      title: 'Info do Estúdio',
      description: 'Localização, horários, especificações de equipamento e contactos',
      icon: MapPin,
      path: '/studio-info',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h1 className="neon-heading">
          Bem-vindo ao Estúdio
        </h1>
        <p className="text-muted-foreground text-lg mt-4">
          Produção musical profissional ao seu alcance
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