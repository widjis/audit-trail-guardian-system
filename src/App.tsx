
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Hires from "./pages/Hires";
import HireDetail from "./pages/HireDetail";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import HrisSync from "./pages/HrisSync";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route that checks for admin role
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Protected route that checks for admin or support role
const AdminOrSupportRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "support"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hires" element={<Hires />} />
          <Route path="/hires/:id" element={<HireDetail />} />
          <Route path="/import" element={<Import />} />
          <Route path="/hris-sync" element={
            <AdminOrSupportRoute>
              <HrisSync />
            </AdminOrSupportRoute>
          } />
          <Route path="/settings" element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
