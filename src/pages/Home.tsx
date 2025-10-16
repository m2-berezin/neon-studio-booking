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
    description: 'Beats personalizados premium criados exclusivamente para ti',
    icon: Music,
    path: '/beats',
    gradient: true
  }, {
    title: 'Subscrições',
    description: 'Subscreve para teres descontos em serviços e obter ofertas exclusivas!',
    icon: CreditCard,
    path: '/subscriptions'
  }];
  
  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${starsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay para melhorar legibilidade */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Welcome Section */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto w-full">
          <div className="mb-12">
            <h1 className="neon-heading mb-8">Bem-vindo ao Futuro.</h1>
          </div>

          {/* Service Cards Grid - Symmetrical Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
