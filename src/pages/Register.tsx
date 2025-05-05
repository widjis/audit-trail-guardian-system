
import { useEffect } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/api";

export default function Register() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-audit-gray">
      <div className="max-w-md w-full space-y-8 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-audit-blue">Audit Guardian</h1>
          <p className="mt-2 text-sm text-gray-600">Create a new account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
