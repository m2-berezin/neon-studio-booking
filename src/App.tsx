import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Book from "./pages/Book";
import Rewards from "./pages/Rewards";
import Subscriptions from "./pages/Subscriptions";
import Beats from "./pages/Beats";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Admin from "@/pages/Admin";
import StudioInfo from "@/pages/StudioInfo";
import MixMaster from "./pages/MixMaster";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/beats" element={<Beats />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/studio-info" element={<StudioInfo />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
