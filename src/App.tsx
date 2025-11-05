import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import { FriendCodeDialog } from "./components/FriendCodeDialog";
import SplashScreen from "./components/SplashScreen";
import Home from "./pages/Home";
import Book from "./pages/Book";
import Rewards from "./pages/Rewards";
import Subscriptions from "./pages/Subscriptions";
import Beats from "./pages/Beats";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import Billing from "./pages/Billing";
import Auth from "./pages/Auth";
import Admin from "@/pages/Admin";
import AdminPayments from "@/pages/AdminPayments";
import AdminBookings from "@/pages/AdminBookings";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminMessages from "@/pages/AdminMessages";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import AdminProjects from "@/pages/AdminProjects";
import AdminReferrals from "@/pages/AdminReferrals";
import AdminBilling from "@/pages/AdminBilling";
import AdminShout from "@/pages/AdminShout";
import StudioInfo from "@/pages/StudioInfo";
import MixMaster from "./pages/MixMaster";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1, // Reduce retries for faster loading
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FriendCodeDialog />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/book" element={<Book />} />
                <Route path="/mix-master" element={<MixMaster />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/beats" element={<Beats />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/settings" element={<ProfileSettings />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/studio-info" element={<StudioInfo />} />
                
                {/* Admin Routes - AdminLayout is already inside each page */}
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/billing" element={<AdminBilling />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/referrals" element={<AdminReferrals />} />
            <Route path="/admin/shout" element={<AdminShout />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
