import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Zap, User, Phone, Shield } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const fullNameSchema = z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters');
const phoneSchema = z.string().trim().min(10, 'Phone must be at least 10 characters').max(20, 'Phone must be less than 20 characters').regex(/^[\d\s\-\+\(\)]+$/, 'Phone can only contain numbers, spaces, and basic punctuation');

const Auth = () => {
  const navigate = useNavigate();
  const { signUp, signIn, signInWithMagicLink, updateProfile, user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminMode, setAdminMode] = useState(false);

  // Redirect if already authenticated
  if (user && profile) {
    navigate('/');
    return null;
  }

  const validateField = (schema: z.ZodSchema, value: string, fieldName: string) => {
    try {
      schema.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0].message;
      }
      return `Invalid ${fieldName}`;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateField(emailSchema, email, 'email');
    const passwordError = validateField(passwordSchema, password, 'password');
    const fullNameError = validateField(fullNameSchema, fullName, 'full name');
    const phoneError = validateField(phoneSchema, phone, 'phone');
    
    const firstError = emailError || passwordError || fullNameError || phoneError;
    if (firstError) {
      toast({
        title: 'Validation Error',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone);
    
    if (error) {
      toast({
        title: 'Sign Up Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link to complete your registration.',
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateField(emailSchema, email, 'email');
    const passwordError = validateField(passwordSchema, password, 'password');
    
    if (emailError || passwordError) {
      toast({
        title: 'Validation Error',
        description: emailError || passwordError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Sign In Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateField(emailSchema, email, 'email');
    
    if (emailError) {
      toast({
        title: 'Validation Error',
        description: emailError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      toast({
        title: 'Magic Link Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
      });
    }
    setLoading(false);
  };

  const handleAdminToggle = async () => {
    if (!isAdmin()) return;
    
    setLoading(true);
    const newRole = adminMode ? 'client' : 'admin';
    const { error } = await updateProfile({ role: newRole });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive',
      });
    } else {
      setAdminMode(!adminMode);
      toast({
        title: 'Success',
        description: `Admin mode ${!adminMode ? 'enabled' : 'disabled'}`,
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'Times New Roman' }}>
            7T7Studios
          </h1>
          <p className="text-muted-foreground">
            Welcome to the studio
          </p>
        </div>

        {/* Admin Toggle - Only visible for admin users */}
        {user && profile && isAdmin() && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Admin Mode</span>
              </div>
              <Button
                variant={adminMode ? "default" : "outline"}
                size="sm"
                onClick={handleAdminToggle}
                disabled={loading}
              >
                {adminMode ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={255}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink}>
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full" 
                disabled={loading}
              >
                <Zap className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                    minLength={10}
                    maxLength={20}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;