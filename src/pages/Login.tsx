
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LoginForm } from "@/components/auth/LoginForm";

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
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', px: { xs: 2, sm: 0 } }}>
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <img
            src="/MTI-removebg-preview.png"
            alt="MTI Logo"
            style={{ height: '80px', width: 'auto', margin: '0 auto 16px' }}
          />
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main' }}>
            MTI User Onboarding System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Streamlined User Onboarding & Audit Management
          </Typography>
        </Box>
        <Card sx={{ maxWidth: 350, mx: 'auto' }}>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
