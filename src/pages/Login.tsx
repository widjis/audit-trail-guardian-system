import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth-service';
import { CircularProgress } from '@mui/material';
import { LoginForm } from '@/components/auth/LoginForm';
import '@/styles/merdeka-login.css';

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!active) return;
      if (authenticated) navigate('/dashboard');
      setIsChecking(false);
    };
    void checkAuth();
    return () => {
      active = false;
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="merdeka-login">
      {isChecking ? (
        <div
          className="merdeka-login-loading"
          role="status"
          aria-label="Checking session"
        >
          <CircularProgress />
        </div>
      ) : (
        <section
          className="merdeka-login-card"
          aria-label="MTI Onboarding sign in"
        >
          <div className="merdeka-login-photo">
            <img src="/image.png" alt="Merdeka Tsingshan Indonesia site" />
            <div className="merdeka-login-photo-content">
              <time dateTime={currentDateTime.toISOString()}>
                {currentDateTime.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </time>
              <h2>Welcome back</h2>
              <p>MTI Onboarding System</p>
            </div>
          </div>
          <div className="merdeka-login-panel">
            <img
              className="merdeka-login-logo"
              src="/merdeka/branding/mbm-logo.svg"
              alt="Merdeka Battery Materials"
            />
            <header>
              <h1>Sign in</h1>
              <p>Access the MTI Onboarding System.</p>
            </header>
            <LoginForm />
            <footer>MTI Onboarding · New Hire Management</footer>
          </div>
        </section>
      )}
    </main>
  );
}
