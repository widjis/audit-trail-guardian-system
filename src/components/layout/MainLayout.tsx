
import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/services/auth-service";
import { useNavigate } from "react-router-dom";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        navigate("/login");
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
