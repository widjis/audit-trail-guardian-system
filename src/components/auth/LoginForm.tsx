
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/services/auth-service";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardActions, Typography, TextField, Button, CircularProgress } from '@mui/material';

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ username, password });
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

  return (
    <Card sx={{ width: '100%', maxWidth: 350 }}>
      <CardHeader
        title={<Typography variant="h6">Login</Typography>}
        subheader={<Typography variant="body2" color="text.secondary">Enter your credentials to access the audit system</Typography>}
      />
      <form onSubmit={handleSubmit}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            fullWidth
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
