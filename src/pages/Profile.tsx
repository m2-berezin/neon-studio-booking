import { User, Settings, Music, Calendar, Award, LogOut, Shield, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const Profile = () => {
  const { user, profile, signOut, updateProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const userStats = [
    { label: 'Sessions Booked', value: '0', icon: Calendar },
    { label: 'Projects Completed', value: '0', icon: Music },
    { label: 'Rewards Earned', value: '0', icon: Award },
  ];

  const menuItems = [
    { label: 'Account Settings', icon: Settings, path: '/settings' },
    { label: 'My Projects', icon: Music, path: '/projects' },
    { label: 'Billing & Subscriptions', icon: Calendar, path: '/billing' },
    { label: 'Help & Support', icon: User, path: '/support' },
  ];

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const toggleAdminMode = async () => {
    if (!profile) return;
    
    setLoading(true);
    const newRole = profile.role === 'admin' ? 'client' : 'admin';
    
    const { error } = await updateProfile({ role: newRole });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Role updated to ${newRole}`,
      });
    }
    setLoading(false);
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <h2 className="text-xl font-bold text-foreground">
              {profile.full_name || 'No name provided'}
            </h2>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground capitalize">{profile.role} Member</span>
              {profile.role === 'admin' && (
                <Shield className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 pt-4 border-t border-border/20 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.phone}</span>
            </div>
          )}
        </div>

        {/* Admin Toggle - Only visible for admin users */}
        {isAdmin() && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Admin Mode</span>
              </div>
              <Button
                variant={profile.role === 'admin' ? "default" : "outline"}
                size="sm"
                onClick={toggleAdminMode}
                disabled={loading}
              >
                {profile.role === 'admin' ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        )}
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

        <div 
          className="studio-card cursor-pointer tap-target"
          onClick={handleSignOut}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <LogOut className="text-destructive" size={18} />
              </div>
              <span className="font-medium text-foreground">
                {loading ? 'Signing out...' : 'Sign Out'}
              </span>
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