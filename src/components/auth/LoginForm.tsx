
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/services/auth-service";
import { authService } from "@/services/auth-service";
import { useNavigate } from "react-router-dom";
import { 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  InputAdornment,
  Divider,
  Alert
} from '@mui/material';
import { 
  Computer, 
  Domain, 
  VpnKey, 
  Email, 
  Lock,
  AutoAwesome
} from '@mui/icons-material';

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<{ authMode: string; ldapFallbackEnabled: boolean } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadAuthConfig();
  }, []);

  const loadAuthConfig = async () => {
    try {
      const config = await authService.getAuthConfig();
      setAuthConfig(config);
      
      // Set default auth method based on config
      if (config.authMode === 'local') {
        setAuthMethod('local');
      } else if (config.authMode === 'ldap') {
        setAuthMethod('ldap');
      } else {
        setAuthMethod('auto'); // hybrid mode allows user choice
      }
    } catch (error) {
      console.error('Error loading auth config:', error);
      // Default to local if config fails to load
      setAuthConfig({ authMode: 'local', ldapFallbackEnabled: false });
      setAuthMethod('local');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const credentials = { 
        username, 
        password,
        authMethod: authMethod === 'auto' ? undefined : authMethod
      };
      
      await login(credentials);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthMethodIcon = (method: string) => {
    switch (method) {
      case 'local':
        return <Computer fontSize="small" />;
      case 'ldap':
        return <Domain fontSize="small" />;
      case 'auto':
        return <AutoAwesome fontSize="small" />;
      default:
        return <VpnKey fontSize="small" />;
    }
  };

  const getAuthMethodLabel = (method: string) => {
    switch (method) {
      case 'local':
        return 'Local Account';
      case 'ldap':
        return 'Active Directory';
      case 'auto':
        return 'Auto-detect';
      default:
        return method;
    }
  };

  const getAuthMethodDescription = (method: string) => {
    switch (method) {
      case 'local':
        return 'Use your local system account';
      case 'ldap':
        return 'Use your domain/LDAP credentials';
      case 'auto':
        return 'System will determine the best method automatically';
      default:
        return '';
    }
  };

  if (configLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const showAuthMethodSelection = authConfig?.authMode === 'hybrid';

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: { xs: 2.5, sm: 3 },
      width: '100%'
    }}>
      {/* Authentication Method Dropdown */}
      {showAuthMethodSelection && (
        <>
          <FormControl fullWidth>
            <InputLabel 
              id="auth-method-label"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              Login Method
            </InputLabel>
            <Select
              labelId="auth-method-label"
              value={authMethod}
              label="Login Method"
              onChange={(e) => setAuthMethod(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  {getAuthMethodIcon(authMethod)}
                </InputAdornment>
              }
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1.5, sm: 2 }
                },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            >
              <MenuItem value="auto">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <AutoAwesome fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      Auto-detect
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Recommended - System chooses best method
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <MenuItem value="local">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Computer fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      Local Account
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Use your local system credentials
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <MenuItem value="ldap">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Domain fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      Active Directory
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Use your domain/LDAP credentials
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Method Description */}
          <Alert 
            severity="info" 
            icon={getAuthMethodIcon(authMethod)}
            sx={{ 
              bgcolor: 'primary.50',
              border: 1,
              borderColor: 'primary.200',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: 'primary.main'
              },
              '& .MuiAlert-message': {
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }
            }}
          >
            <Typography 
              variant="body2"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              {getAuthMethodDescription(authMethod)}
            </Typography>
          </Alert>

          <Divider />
        </>
      )}
      
      {/* Email/Username Field */}
      <TextField
        label={authMethod === 'ldap' ? "Domain Username" : "Email"}
        variant="outlined"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        disabled={isLoading}
        fullWidth
        placeholder={
          authMethod === 'ldap' 
            ? "john.doe@merdekabattery.com" 
            : "mti.user@merdekabattery.com"
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" fontSize="small" />
            </InputAdornment>
          ),
          sx: {
            fontSize: { xs: '0.875rem', sm: '1rem' },
            py: { xs: 0.5, sm: 0 }
          }
        }}
        InputLabelProps={{
          sx: { fontSize: { xs: '0.875rem', sm: '1rem' } }
        }}
        helperText={
          authMethod === 'ldap' 
            ? "Use your domain username (e.g., john.doe or DOMAIN\\john.doe)"
            : "Enter your email address"
        }
        FormHelperTextProps={{
          sx: { fontSize: { xs: '0.7rem', sm: '0.75rem' } }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          }
        }}
      />

      {/* Password Field */}
      <TextField
        label="Password"
        type="password"
        variant="outlined"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        fullWidth
        placeholder="At least 8 characters"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" fontSize="small" />
            </InputAdornment>
          ),
          sx: {
            fontSize: { xs: '0.875rem', sm: '1rem' },
            py: { xs: 0.5, sm: 0 }
          }
        }}
        InputLabelProps={{
          sx: { fontSize: { xs: '0.875rem', sm: '1rem' } }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          }
        }}
      />

      {/* Forgot Password Link */}
      <Box sx={{ textAlign: 'right' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'primary.main', 
            cursor: 'pointer',
            textDecoration: 'underline',
            '&:hover': { color: 'primary.dark' },
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}
        >
          Forgot Password?
        </Typography>
      </Box>

      {/* Login Button */}
      <Button 
        type="submit" 
        variant="contained" 
        disabled={isLoading} 
        fullWidth
        size="large"
        sx={{
          py: { xs: 1.25, sm: 1.5 },
          borderRadius: 2,
          textTransform: 'none',
          fontSize: { xs: '0.9rem', sm: '1rem' },
          fontWeight: 600,
          boxShadow: 2,
          '&:hover': {
            boxShadow: 4,
          },
          minHeight: { xs: '48px', sm: '56px' }
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} color="inherit" />
            <span>Signing in...</span>
          </Box>
        ) : (
          "Log In"
        )}
      </Button>
    </Box>
  );
}
