import { Gift, Star, Crown, Zap } from 'lucide-react';

const Rewards = () => {
  const currentPoints = 1250;
  const nextTierPoints = 2000;
  const progress = (currentPoints / nextTierPoints) * 100;

  const rewards = [
    { 
      title: 'Free Studio Hour', 
      points: 500, 
      icon: Star,
      available: true,
      description: 'One hour of free studio time'
    },
    { 
      title: 'Premium Beat Pack', 
      points: 750, 
      icon: Gift,
      available: true,
      description: '10 exclusive beats from our producers'
    },
    { 
      title: 'Mixing Discount 25%', 
      points: 1000, 
      icon: Zap,
      available: true,
      description: '25% off your next mixing session'
    },
    { 
      title: 'VIP Membership', 
      points: 2500, 
      icon: Crown,
      available: false,
      description: 'Priority booking and exclusive access'
    },
  ];

  const recentActivity = [
    { action: 'Booked session', points: '+100', date: 'Today' },
    { action: 'Referred friend', points: '+250', date: 'Yesterday' },
    { action: 'Completed project', points: '+150', date: '2 days ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Studio Rewards
        </h1>
        <p className="text-muted-foreground">
          Earn points and unlock exclusive perks
        </p>
      </div>

      {/* Points Balance */}
      <div className="studio-card bg-gradient-to-br from-accent/10 to-primary/10">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-primary neon-glow mb-2">
            {currentPoints.toLocaleString()}
          </h2>
          <p className="text-muted-foreground mb-4">Available Points</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {nextTierPoints - currentPoints} points to VIP status
          </p>
        </div>
      </div>

      {/* Available Rewards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Available Rewards</h2>
        <div className="space-y-3">
          {rewards.map((reward) => (
            <div 
              key={reward.title} 
              className={`studio-card ${!reward.available ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    reward.available ? 'bg-primary/20' : 'bg-secondary'
                  }`}>
                    <reward.icon 
                      size={20} 
                      className={reward.available ? 'text-primary' : 'text-muted-foreground'} 
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{reward.title}</h3>
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">
                    {reward.points} pts
                  </p>
                  {reward.available && currentPoints >= reward.points && (
                    <button className="text-xs text-primary neon-glow font-medium">
                      Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="studio-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.date}</p>
                </div>
                <span className="text-primary font-bold neon-glow">
                  {activity.points}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Rewards;