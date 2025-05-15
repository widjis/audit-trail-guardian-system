import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        navigate("/dashboard");
      }
      setIsChecking(false);
    };
    
    checkAuth();
  }, [isAuthenticated, navigate]);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-audit-gray">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-audit-gray">
      <div className="max-w-md w-full space-y-8 p-4 text-center">
        <div>
          <h1 className="text-4xl font-bold text-audit-blue">MTI User Onboarding System</h1>
          <p className="mt-4 text-xl text-gray-600">Streamlined User Onboarding & Audit Management</p>
          <p className="mt-2 text-gray-500">
            Efficiently onboard users and manage audit trails with MTI's comprehensive workflow solution.
          </p>
        </div>
        <div className="flex flex-col space-y-4 pt-8">
          <Button
            className="w-full py-6 text-lg"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <a 
              href="#" 
              onClick={(e) => { 
                e.preventDefault(); 
                navigate("/register"); 
              }}
              className="text-audit-blue hover:underline"
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
