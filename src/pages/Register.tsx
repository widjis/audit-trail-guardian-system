
import { useEffect, useState } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";

export default function Register() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
      <div className="max-w-md w-full space-y-8 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-audit-blue">MTI Onboarding Workflow</h1>
          <p className="mt-2 text-sm text-gray-600">Create a new account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
