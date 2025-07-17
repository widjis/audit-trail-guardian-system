
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        overflow: 'auto'
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
          gap: { xs: 0, md: 4 }, 
          alignItems: 'center',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'center'
        }}>
          
          {/* Left Side - Welcome Content */}
          <Box 
            sx={{ 
              flex: { md: 1 }, 
              color: 'white',
              display: { xs: 'none', md: 'block' },
              maxWidth: { md: '500px' },
              pr: { md: 2, lg: 4 }
            }}
          >
            <Box sx={{ mb: { md: 3, lg: 4 } }}>
              <Chip 
                icon={<TrendingUp />}
                label={formatDateTime(currentDateTime)}
                sx={{ 
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  color: 'white',
                  mb: 3,
                  '& .MuiChip-icon': { color: 'white' },
                  fontFamily: 'monospace',
                  fontSize: { md: '0.8rem', lg: '0.85rem' }
                }}
              />
            </Box>
            
            <Typography 
              variant="h2" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                mb: 2,
                fontSize: { md: '2.5rem', lg: '3rem', xl: '3.5rem' },
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
                fontWeight: 400,
                fontSize: { md: '1.1rem', lg: '1.25rem' }
              }}
            >
              Today is a new day. It's your day. You shape it.
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                mb: { md: 3, lg: 4 },
                opacity: 0.8,
                fontSize: { md: '0.95rem', lg: '1rem' }
              }}
            >
              Sign in to start managing new hire employees.
            </Typography>

            {/* Feature highlights */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Factory sx={{ opacity: 0.8, fontSize: { md: '1.2rem', lg: '1.5rem' } }} />
                <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { md: '0.85rem', lg: '0.9rem' } }}>
                  Onboarding system audit log
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ opacity: 0.8, fontSize: { md: '1.2rem', lg: '1.5rem' } }} />
                <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { md: '0.85rem', lg: '0.9rem' } }}>
                  Enterprise security & compliance
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right Side - Login Form */}
          <Box sx={{ 
            flex: { xs: 'none', md: 'none' }, 
            width: { xs: '100%', sm: '400px', md: '420px', lg: '450px' },
            maxWidth: { xs: '100%', sm: '400px' }
          }}>
            <Paper
              elevation={24}
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
                bgcolor: 'background.paper',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.1)}`,
                width: '100%',
                maxHeight: { xs: 'calc(100vh - 32px)', sm: 'none' },
                overflow: 'auto'
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
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
