
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
import OnboardEmail from "./pages/OnboardEmail";
import WorkflowDemo from "./pages/WorkflowDemo";
import AccountSetup from "./pages/AccountSetup";
import NotFound from "./pages/NotFound";
import { RecruiterHireForm } from "./components/hires/RecruiterHireForm";

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

// Protected route that checks for admin or IT support role
const AdminOrSupportRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "it_support"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Protected route that checks for IT Support or Admin role
const ITSupportRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "it_support"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Protected route that checks for approval roles (HRIS SPV, IT Superintendent, Admin)
const ApprovalRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "hris_spv", "it_superintendent"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Protected route that checks for roles that can access hires (Recruiter, Approvers, IT Support, Admin)
const HiresRoute = ({ children }: { children: React.ReactNode }) => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "recruiter", "hris_spv", "it_superintendent", "it_support"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Route for new hire form - shows different components based on role
const NewHireRoute = () => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!["admin", "recruiter", "hris_spv", "it_superintendent", "it_support"].includes(user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Recruiters get the simplified form
  if (user?.role === "recruiter") {
    return <RecruiterHireForm />;
  }
  
  // Other roles get redirected to the full hires page
  return <Navigate to="/hires" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/index" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hires" element={
            <HiresRoute>
              <Hires />
            </HiresRoute>
          } />
          <Route path="/hires/new" element={<NewHireRoute />} />
          <Route path="/hires/:id" element={
            <HiresRoute>
              <HireDetail />
            </HiresRoute>
          } />
          <Route path="/import" element={
            <AdminOrSupportRoute>
              <Import />
            </AdminOrSupportRoute>
          } />
          <Route path="/onboard-email" element={
            <AdminOrSupportRoute>
              <OnboardEmail />
            </AdminOrSupportRoute>
          } />
          <Route path="/workflow-demo" element={<WorkflowDemo />} />
          <Route path="/account-setup" element={
            <ITSupportRoute>
              <AccountSetup />
            </ITSupportRoute>
          } />
          <Route path="/approvals" element={
            <ApprovalRoute>
              <Hires />
            </ApprovalRoute>
          } />
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
