import { User, Settings, Music, Calendar, Award, LogOut } from 'lucide-react';

const Profile = () => {
  const userStats = [
    { label: 'Sessions Booked', value: '24', icon: Calendar },
    { label: 'Projects Completed', value: '12', icon: Music },
    { label: 'Rewards Earned', value: '1,250', icon: Award },
  ];

  const menuItems = [
    { label: 'Account Settings', icon: Settings, path: '/settings' },
    { label: 'My Projects', icon: Music, path: '/projects' },
    { label: 'Billing & Subscriptions', icon: Calendar, path: '/billing' },
    { label: 'Help & Support', icon: User, path: '/support' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Your Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your studio account
        </p>
      </div>

      {/* Profile Header */}
      <div className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <User className="text-primary" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">Artist Name</h2>
            <p className="text-muted-foreground">VIP Member</p>
            <p className="text-sm text-muted-foreground">Member since Jan 2024</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {userStats.map((stat) => (
          <div key={stat.label} className="studio-card text-center">
            <stat.icon className="text-primary mx-auto mb-2" size={20} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <div key={item.label} className="studio-card cursor-pointer tap-target">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <item.icon className="text-accent" size={18} />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="text-muted-foreground">
                →
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Actions */}
      <div className="space-y-3">
        <div className="studio-card cursor-pointer tap-target">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-secondary rounded-lg">
                <Settings className="text-accent" size={18} />
              </div>
              <span className="font-medium text-foreground">App Settings</span>
            </div>
            <div className="text-muted-foreground">
              →
            </div>
          </div>
        </div>

        <div className="studio-card cursor-pointer tap-target">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <LogOut className="text-destructive" size={18} />
              </div>
              <span className="font-medium text-foreground">Sign Out</span>
            </div>
            <div className="text-muted-foreground">
              →
            </div>
          </div>
        </div>
      </div>

      {/* App Version */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          7T7Studios v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Profile;