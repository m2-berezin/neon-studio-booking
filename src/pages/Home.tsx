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
      title: 'Mix & Master',
      description: 'Serviço profissional de mistura e masterização para os seus projectos',
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
      description: 'Poupe com os nossos planos de subscrição S e X',
      icon: CreditCard,
      path: '/subscriptions',
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