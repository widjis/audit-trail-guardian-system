
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";
import { useEffect } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { initializePerformanceMonitoring } from './utils/performance';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Hires from "./pages/Hires";
import HireDetail from "./pages/HireDetail";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import HrisSync from "./pages/HrisSync";
import OnboardEmail from "./pages/OnboardEmail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

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

const App = () => {
  useEffect(() => {
    // Initialize performance monitoring
    initializePerformanceMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                } />
                <Route path="/hires" element={
                  <ErrorBoundary>
                    <Hires />
                  </ErrorBoundary>
                } />
                <Route path="/hires/:id" element={
                  <ErrorBoundary>
                    <HireDetail />
                  </ErrorBoundary>
                } />
                <Route path="/import" element={
                  <ErrorBoundary>
                    <Import />
                  </ErrorBoundary>
                } />
                <Route path="/onboard-email" element={
                  <ErrorBoundary>
                    <OnboardEmail />
                  </ErrorBoundary>
                } />
                <Route path="/hris-sync" element={
                  <AdminOrSupportRoute>
                    <ErrorBoundary>
                      <HrisSync />
                    </ErrorBoundary>
                  </AdminOrSupportRoute>
                } />
                <Route path="/settings" element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <Settings />
                    </ErrorBoundary>
                  </AdminRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
