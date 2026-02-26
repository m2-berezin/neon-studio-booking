import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import { Calendar, Music, FolderOpen, Gift, CreditCard, MapPin, Upload } from 'lucide-react';
import starsBg from '@/assets/stars-bg.gif';

const Home = () => {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  
  // Trigger fresh rebuild
  
  const services = [{
    title: 'Reservar Sessão',
    description: 'Agenda a tua sessão de estúdio',
    icon: Calendar,
    path: '/book',
    gradient: true
  }, {
    title: 'Mix & Master',
    description: 'Envia os teus projetos',
    icon: Upload,
    path: '/mix-master',
    gradient: true
  }, {
    title: 'Beats Exclusivos',
    description: 'Beats personalizados premium',
    icon: Music,
    path: '/beats',
    gradient: true
  }, {
    title: 'Subscrições',
    description: 'Obtém descontos nos serviços',
    icon: CreditCard,
    path: '/subscriptions',
    gradient: true
  }];
  
  return (
    <div 
      className="flex flex-col relative overflow-hidden"
      style={{
        height: 'calc(100dvh - 120px)',
        backgroundImage: `url(${starsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay para melhorar legibilidade */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Welcome Section */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="neon-heading mb-4 text-xl md:text-3xl">Bem-vindo ao Futuro.</h1>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
            {services.map(service => (
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
