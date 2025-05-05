
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/api";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-audit-gray">
      <div className="max-w-md w-full space-y-8 p-4 text-center">
        <div>
          <h1 className="text-4xl font-bold text-audit-blue">MTI Onboarding Workflow</h1>
          <p className="mt-4 text-xl text-gray-600">New Hire Audit Log Management System</p>
          <p className="mt-2 text-gray-500">
            Streamline your onboarding process with comprehensive audit trails and task management
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
