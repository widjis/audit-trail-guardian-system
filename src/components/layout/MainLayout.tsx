import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Drawer, useMediaQuery } from '@mui/material';
import { authService, useAuth } from '@/services/auth-service';
import { userPreferencesService } from '@/services/user-preferences-service';
import { Sidebar } from './Sidebar';
import '@/styles/merdeka.css';

interface MainLayoutProps {
  children: ReactNode;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  hires: 'New Hires',
  import: 'Import Data',
  'onboard-email': 'Onboard Welcome Email',
  'hris-sync': 'HRIS Sync',
  settings: 'Settings',
  'workflow-demo': 'Workflow Demo',
};

export function MainLayout({ children }: MainLayoutProps) {
  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width:991.98px)');
  const user = getCurrentUser();
  const routePath = pathname.replace(/\/+$/, '') || '/';
  const section = routePath.split('/')[1];
  const title = titles[section] || 'MTI Onboarding';

  useEffect(() => {
    let active = true;
    document.body.dataset.merdekaUi = 'true';
    const checkSession = async () => {
      const authenticated = await authService.verifyToken();
      if (!active) return;
      if (!authenticated) {
        navigate('/login', { replace: true });
        return;
      }
      setIsLoading(false);
      try {
        const preferences = await userPreferencesService.getPreferences();
        if (active) setSidebarCollapsed(Boolean(preferences.sidebarCollapsed));
      } catch (error) {
        console.error('Failed to load sidebar preference:', error);
      }
    };
    void checkSession();
    return () => {
      active = false;
      delete document.body.dataset.merdekaUi;
    };
  }, [navigate]);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const initials = String(user?.username || 'User')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`merdeka-surface merdeka-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
    >
      <a className="merdeka-skip-link" href="#main-content">
        Skip to content
      </a>
      {isLoading ? (
        <div className="merdeka-session-loader" role="status">
          Checking session…
        </div>
      ) : (
        <div className="page">
          {!isMobile && (
            <aside
              className={`navbar navbar-vertical navbar-expand-lg mdka-bg-gray-50 merdeka-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
            >
              <Sidebar
                collapsed={sidebarCollapsed}
                onCollapseChange={setSidebarCollapsed}
              />
            </aside>
          )}
          <Drawer
            anchor="left"
            open={isMobile && mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: 240 } }}
          >
            <div className="merdeka-surface merdeka-mobile-sidebar">
              <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} />
            </div>
          </Drawer>
          <header className="navbar navbar-expand-md merdeka-topbar">
            <div className="container-fluid">
              <div className="merdeka-header-heading">
                {isMobile && (
                  <button
                    className="merdeka-icon-button"
                    aria-label="Open navigation"
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen(true)}
                  >
                    <i className="ti ti-menu-2" aria-hidden="true" />
                  </button>
                )}
                {isMobile && (
                  <img
                    className="merdeka-mobile-logo"
                    src="/merdeka/branding/mbm-logo.svg"
                    alt="Merdeka Battery Materials"
                  />
                )}
                {!isMobile && (
                  <svg
                    className="merdeka-header-chevron"
                    aria-hidden="true"
                    width="5"
                    height="8"
                    viewBox="0 0 5 8"
                    fill="none"
                  >
                    <path
                      d="M4.25 0.75L0.75 4L4.25 7.25"
                      stroke="#64748B"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span className="merdeka-header-title">{title}</span>
              </div>
              <div className="merdeka-header-account">
                <span className="merdeka-company">
                  PT. MERDEKA TSINGSHAN INDONESIA
                </span>
                <div
                  className="merdeka-user"
                  title={`${user?.username || 'User'} · ${user?.role || ''}`}
                >
                  <span className="merdeka-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="merdeka-user-info">
                    <strong>{user?.username || 'User'}</strong>
                    <small>{user?.role}</small>
                  </span>
                </div>
                <span
                  className="merdeka-account-separator"
                  aria-hidden="true"
                />
                <button
                  className="merdeka-icon-button merdeka-logout"
                  aria-label="Logout"
                  title="Logout"
                  onClick={logout}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.75 8.75L19.25 12L15.75 15.25"
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                    <path
                      d="M19 12H10.75"
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                    <path
                      d="M15.25 4.75H6.75C5.64543 4.75 4.75 5.64543 4.75 6.75V17.25C4.75 18.3546 5.64543 19.25 6.75 19.25H15.25"
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </header>
          <div className="page-wrapper">
            <div className="page-header">
              <div className="container-xl">
                <nav aria-label="Breadcrumb">
                  <ol className="breadcrumb breadcrumb-arrows">
                    <li className="breadcrumb-item">
                      <Link to="/dashboard">Dashboard</Link>
                    </li>
                    {section !== 'dashboard' && (
                      <li
                        className="breadcrumb-item active"
                        aria-current="page"
                      >
                        {section === 'hires' && routePath !== '/hires' ? (
                          <Link to="/hires">New Hires</Link>
                        ) : (
                          title
                        )}
                      </li>
                    )}
                    {section === 'hires' && routePath !== '/hires' && (
                      <li
                        className="breadcrumb-item active"
                        aria-current="page"
                      >
                        {routePath === '/hires/new'
                          ? 'Add New Hire'
                          : 'Hire Details'}
                      </li>
                    )}
                  </ol>
                </nav>
              </div>
            </div>
            <main
              id="main-content"
              className={`container-xl merdeka-main${routePath === '/hires' ? '' : ' merdeka-legacy'}`}
              tabIndex={-1}
            >
              {children}
            </main>
            <footer className="merdeka-footer">
              MTI Onboarding · New Hire Management
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
