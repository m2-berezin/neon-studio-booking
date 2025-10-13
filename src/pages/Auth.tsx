import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Por favor, introduza um endereço de email válido');
const passwordSchema = z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres');
const fullNameSchema = z.string().trim().min(2, 'O nome completo deve ter pelo menos 2 caracteres').max(100, 'O nome completo deve ter menos de 100 caracteres');
const phoneSchema = z.string().trim().min(9, 'O telefone deve ter pelo menos 9 dígitos').max(20, 'O telefone deve ter menos de 20 caracteres').regex(/^[\d\s\-\+\(\)]+$/, 'O telefone só pode conter números, espaços e pontuação básica');

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
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

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
        title: 'Erro de Registo',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verifica o teu email',
        description: 'Enviámos um link de confirmação para completar o registo.',
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Skip email validation if it's a phone number
    const isPhoneNumber = /^9\d{8}$/.test(email);
    if (!isPhoneNumber) {
      const emailError = validateField(emailSchema, email, 'email');
      if (emailError) {
        toast({
          title: 'Erro de Validação',
          description: emailError,
          variant: 'destructive',
        });
        return;
      }
    }
    
    const passwordError = validateField(passwordSchema, password, 'password');
    if (passwordError) {
      toast({
        title: 'Erro de Validação',
        description: passwordError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Erro de Início de Sessão',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
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
        title: 'Erro',
        description: 'Falha ao atualizar o estado de administrador',
        variant: 'destructive',
      });
    } else {
      setAdminMode(!adminMode);
      toast({
        title: 'Sucesso',
        description: `Modo de administrador ${!adminMode ? 'activado' : 'desactivado'}`,
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
            Bem-vindo ao estúdio
          </p>
        </div>

        {/* Admin Toggle - Only visible for admin users */}
        {user && profile && isAdmin() && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Modo Admin</span>
              </div>
              <Button
                variant={adminMode ? "default" : "outline"}
                size="sm"
                onClick={handleAdminToggle}
                disabled={loading}
              >
                {adminMode ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Iniciar Sessão</TabsTrigger>
            <TabsTrigger value="signup">Registar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Email ou Número (9XXXXXXXX)"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Palavra-passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'A iniciar sessão...' : 'Iniciar Sessão'}
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
                    placeholder="Nome Completo"
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
                    placeholder="Número de Telefone (min. 9 dígitos)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                    minLength={9}
                    maxLength={20}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="Palavra-passe (min. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'A criar conta...' : 'Registar'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;