
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";

export default function Login() {
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
      <div>
        <div className="mb-8 text-center">
          <img
            src="/MTI-removebg-preview.png"
            alt="MTI Logo"
            className="mx-auto mb-4 h-20 w-auto"
          />
          <h1 className="text-3xl font-bold text-audit-blue">MTI User Onboarding System</h1>
          <p className="mt-2 text-sm text-gray-600">Streamlined User Onboarding & Audit Management</p>
        </div>
        <div className="max-w-md w-full space-y-8 p-4 mx-auto">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
