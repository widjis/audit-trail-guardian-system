
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth-service";
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Container,
  Paper,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { LoginForm } from "@/components/auth/LoginForm";
import { Factory, Security, TrendingUp } from '@mui/icons-material';

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const theme = useTheme();

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

  // Update current date and time every minute
  useEffect(() => {
    const updateDateTime = () => {
      setCurrentDateTime(new Date());
    };

    // Update immediately
    updateDateTime();

    // Set up interval to update every minute
    const interval = setInterval(updateDateTime, 60000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Format date and time for display
  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    const formatted = date.toLocaleDateString('en-US', options);
    // Convert MM/DD/YY HH:MM format to MM.DD.YY HH:MM
    return formatted.replace(/\//g, '.').replace(', ', ' ');
  };

  if (isChecking) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundImage: 'url(/blurry.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            zIndex: 0
          }
        }}
      >
        <CircularProgress sx={{ color: 'white', position: 'relative', zIndex: 1 }} />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        backgroundImage: 'url(/blurry.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'auto',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 0
        }
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.3
        }}
      />

      <Container 
        maxWidth="lg" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: { xs: 2, sm: 3, md: 4 }, 
          px: { xs: 2, sm: 3 },
          position: 'relative', 
          zIndex: 1,
          minHeight: '100vh'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          width: '100%', 
          maxWidth: '1200px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Login Form */}
          <Box sx={{ 
            flex: 1, 
            width: { xs: '100%', sm: '500px', md: '1200px', lg: '1400px' },
            maxWidth: { xs: '100%', sm: '500px', md: '1400px' }
          }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: { xs: 2, md: 3 },
                bgcolor: 'background.paper',
                width: '100%',
                minHeight: { xs: 'calc(100vh - 32px)', md: '700px' },
                overflow: 'hidden',
                boxShadow: { xs: 'none', md: '0 8px 32px rgba(0, 0, 0, 0.12)' },
                border: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' },
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' }
              }}
            >
              {/* Left side - Welcome Section with Background */}
              <Box
                sx={{
                  flex: { xs: 0, md: 1 },
                  display: { xs: 'none', md: 'flex' },
                  backgroundImage: 'url("/image.png")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  position: 'relative',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  p: 6,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                  }
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1, color: 'white' }}>
                  <Chip 
                    icon={<TrendingUp />}
                    label={formatDateTime(currentDateTime)}
                    sx={{ 
                      bgcolor: alpha(theme.palette.common.white, 0.2),
                      color: 'white',
                      mb: 3,
                      '& .MuiChip-icon': { color: 'white' },
                      fontFamily: 'monospace',
                      fontSize: '0.85rem'
                    }}
                  />
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      fontSize: { md: '3rem', lg: '3.5rem' },
                      lineHeight: 1.2
                    }}
                  >
                    Welcome Back 👋
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 1,
                      opacity: 0.9,
                      fontSize: '1.1rem',
                      fontWeight: 400
                    }}
                  >
                    Today is a new day. It's your day. You shape it.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      mb: 4,
                      opacity: 0.8,
                      fontSize: '1rem'
                    }}
                  >
                    Sign in to start managing new hire employees.
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Factory sx={{ opacity: 0.8, fontSize: '1.5rem' }} />
                      <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.9rem' }}>
                        Onboarding system audit log
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Security sx={{ opacity: 0.8, fontSize: '1.5rem' }} />
                      <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.9rem' }}>
                        Enterprise security & compliance
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              
              {/* Right side - Login form */}
              <Box
                sx={{
                  flex: { xs: 1, md: '0 0 450px' },
                  p: { xs: 3, sm: 4, md: 5 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
              {/* Mobile Header - Only show on mobile */}
              <Box sx={{ 
                display: { xs: 'block', md: 'none' }, 
                textAlign: 'center', 
                mb: 3,
                color: theme.palette.primary.main
              }}>
                <Typography 
                  variant="h5" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 1,
                    fontSize: { xs: '1.5rem', sm: '1.75rem' }
                  }}
                >
                  Welcome Back 👋
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Sign in to start new hire employees
                </Typography>
              </Box>

              {/* Logo and Title */}
              <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
                <img
                  src="/MTI-removebg-preview.png"
                  alt="MTI Logo"
                  style={{ 
                    height: '50px', 
                    width: 'auto', 
                    marginBottom: '12px',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }}
                />
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom 
                  sx={{ 
                    color: 'text.primary',
                    fontWeight: 600,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                  }}
                >
                  MTI Onboarding System
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    mb: 2,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  Streamlined User Onboarding & Audit Management
                </Typography>
              </Box>

              <LoginForm />

              {/* Footer */}
              <Box sx={{ 
                textAlign: 'center', 
                mt: { xs: 2, sm: 3 }, 
                pt: { xs: 2, sm: 3 }, 
                borderTop: 1, 
                borderColor: 'divider' 
              }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  Don't you have an account?{' '}
                  <Typography 
                    component="span" 
                    variant="caption" 
                    sx={{ 
                      color: 'primary.main', 
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      '&:hover': { color: 'primary.dark' },
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    Sign Up
                  </Typography>
                </Typography>
              </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
