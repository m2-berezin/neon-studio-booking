-- Drop existing profiles table and recreate with new structure
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create enhanced profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  penalty_until DATE,
  last_voucher_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recording', 'mixing', 'mastering', 'exclusive_beat')),
  base_price NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability rules
CREATE TABLE public.availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blackout dates
CREATE TABLE public.blackout_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'no_show', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rewards usage tracking
CREATE TABLE public.rewards_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, reward_code, year, month)
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('8h', '16h')),
  hours_per_month INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2),
  active BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription preferences
CREATE TABLE public.subscription_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  preferred_days TEXT[],
  preferred_time_windows JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  redeemed BOOLEAN DEFAULT false,
  combinable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'awaiting_feedback', 'delivered', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('idea', 'stems', 'draft', 'final')),
  url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('project', 'direct')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Profiles policies
CREATE POLICY "Users can view their own profile and admins can view all" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile and admins can update all" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Services policies (read-only for clients, full access for admins)
CREATE POLICY "Everyone can view active services" 
ON public.services FOR SELECT 
USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can modify services" 
ON public.services FOR ALL 
USING (public.is_admin());

-- Availability rules policies (read-only for clients, full access for admins)
CREATE POLICY "Everyone can view active availability rules" 
ON public.availability_rules FOR SELECT 
USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can modify availability rules" 
ON public.availability_rules FOR ALL 
USING (public.is_admin());

-- Blackout dates policies (read-only for clients, full access for admins)
CREATE POLICY "Everyone can view blackout dates" 
ON public.blackout_dates FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify blackout dates" 
ON public.blackout_dates FOR ALL 
USING (public.is_admin());

-- Bookings policies
CREATE POLICY "Clients can view their own bookings, admins can view all" 
ON public.bookings FOR SELECT 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Clients can create their own bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own bookings, admins can update all" 
ON public.bookings FOR UPDATE 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Only admins can delete bookings" 
ON public.bookings FOR DELETE 
USING (public.is_admin());

-- Rewards usage policies
CREATE POLICY "Clients can view their own rewards usage, admins can view all" 
ON public.rewards_usage FOR SELECT 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Clients can create their own rewards usage" 
ON public.rewards_usage FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own rewards usage, admins can update all" 
ON public.rewards_usage FOR UPDATE 
USING (auth.uid() = client_id OR public.is_admin());

-- Subscriptions policies
CREATE POLICY "Clients can view their own subscriptions, admins can view all" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Only admins can modify subscriptions" 
ON public.subscriptions FOR ALL 
USING (public.is_admin());

-- Subscription preferences policies
CREATE POLICY "Clients can view their own subscription preferences, admins can view all" 
ON public.subscription_preferences FOR SELECT 
USING (
  auth.uid() = (SELECT client_id FROM public.subscriptions WHERE id = subscription_id)
  OR public.is_admin()
);

CREATE POLICY "Clients can modify their own subscription preferences, admins can modify all" 
ON public.subscription_preferences FOR ALL 
USING (
  auth.uid() = (SELECT client_id FROM public.subscriptions WHERE id = subscription_id)
  OR public.is_admin()
);

-- Vouchers policies
CREATE POLICY "Clients can view their own vouchers, admins can view all" 
ON public.vouchers FOR SELECT 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Only admins can modify vouchers" 
ON public.vouchers FOR ALL 
USING (public.is_admin());

-- Projects policies
CREATE POLICY "Clients can view their own projects, admins can view all" 
ON public.projects FOR SELECT 
USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Clients can create their own projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own projects, admins can update all" 
ON public.projects FOR UPDATE 
USING (auth.uid() = client_id OR public.is_admin());

-- Files policies
CREATE POLICY "Clients can view files for their own projects, admins can view all" 
ON public.files FOR SELECT 
USING (
  auth.uid() = (SELECT client_id FROM public.projects WHERE id = project_id)
  OR public.is_admin()
);

CREATE POLICY "Clients can manage files for their own projects, admins can manage all" 
ON public.files FOR ALL 
USING (
  auth.uid() = (SELECT client_id FROM public.projects WHERE id = project_id)
  OR public.is_admin()
);

-- Messages policies
CREATE POLICY "Users can view messages they sent or received, admins can view all" 
ON public.messages FOR SELECT 
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id 
  OR auth.uid() = (SELECT client_id FROM public.projects WHERE id = project_id)
  OR public.is_admin()
);

CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Only admins can update/delete messages" 
ON public.messages FOR ALL 
USING (public.is_admin());

-- Notifications policies
CREATE POLICY "Users can view their own notifications, admins can view all" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own notifications, admins can update all" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (public.is_admin());

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at column and trigger to profiles
ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the trigger function to handle new user signup with enhanced profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;