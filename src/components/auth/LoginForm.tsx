
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/services/auth-service";
import { authService } from "@/services/auth-service";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardActions, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Divider,
  Chip
} from '@mui/material';
import { Computer, Domain, VpnKey } from '@mui/icons-material';

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
        return 'System will determine the best method';
      default:
        return '';
    }
  };

  if (configLoading) {
    return (
      <Card sx={{ width: '100%', maxWidth: 350 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const showAuthMethodSelection = authConfig?.authMode === 'hybrid';

  return (
    <Card sx={{ width: '100%', maxWidth: 400 }}>
      <CardHeader
        title={<Typography variant="h6">Login</Typography>}
        subheader={<Typography variant="body2" color="text.secondary">Enter your credentials to access the audit system</Typography>}
      />
      <form onSubmit={handleSubmit}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {showAuthMethodSelection && (
            <>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Authentication Method</Typography>
                </FormLabel>
                <RadioGroup
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  sx={{ gap: 1 }}
                >
                  <FormControlLabel
                    value="auto"
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAuthMethodIcon('auto')}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getAuthMethodLabel('auto')}
                            <Chip label="Recommended" size="small" color="primary" sx={{ ml: 1, height: 16 }} />
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getAuthMethodDescription('auto')}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="local"
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAuthMethodIcon('local')}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getAuthMethodLabel('local')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getAuthMethodDescription('local')}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="ldap"
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAuthMethodIcon('ldap')}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getAuthMethodLabel('ldap')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getAuthMethodDescription('ldap')}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              <Divider />
            </>
          )}
          
          <TextField
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            fullWidth
            helperText={
              authMethod === 'ldap' 
                ? "Use your domain username (e.g., john.doe or DOMAIN\\john.doe)"
                : "Enter your username"
            }
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            fullWidth
          />
        </CardContent>
        <CardActions>
          <Button type="submit" variant="contained" disabled={isLoading} fullWidth>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>
        </CardActions>
      </form>
    </Card>
  );
}
