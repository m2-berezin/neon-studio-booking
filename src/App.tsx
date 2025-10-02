import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
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
import Auth from "./pages/Auth";
import Admin from "@/pages/Admin";
import AdminPayments from "@/pages/AdminPayments";
import AdminBookings from "@/pages/AdminBookings";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminMessages from "@/pages/AdminMessages";
import { AdminLayout } from "@/components/admin/AdminLayout";
import DayOff from "@/components/admin/DayOff";
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
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/studio-info" element={<StudioInfo />} />
                
                {/* Admin Routes with AdminLayout */}
                <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                <Route path="/admin/bookings" element={<AdminLayout><AdminBookings /></AdminLayout>} />
                <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />
                <Route path="/admin/messages" element={<AdminLayout><AdminMessages /></AdminLayout>} />
                <Route path="/admin/dayoff" element={<AdminLayout><DayOff /></AdminLayout>} />
                
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
