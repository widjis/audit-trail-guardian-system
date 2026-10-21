import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth-service';
import { useUserPreferences } from '@/services/user-preferences-service';

interface SidebarProps {
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  collapsed: boolean;
}

export function Sidebar({
  onClose,
  onCollapseChange,
  collapsed,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { getCurrentUser } = useAuth();
  const { savePreference } = useUserPreferences();
  const user = getCurrentUser();
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { label: 'New Hires', path: '/hires', icon: 'users' },
    { label: 'Import Data', path: '/import', icon: 'upload' },
    { label: 'Onboard Welcome Email', path: '/onboard-email', icon: 'mail' },
    ...(['admin', 'support'].includes(user?.role || '')
      ? [{ label: 'HRIS Sync', path: '/hris-sync', icon: 'refresh' }]
      : []),
    ...(user?.role === 'admin'
      ? [{ label: 'Settings', path: '/settings', icon: 'settings' }]
      : []),
  ];

  const toggleSidebar = () => {
    const next = !collapsed;
    onCollapseChange?.(next);
    savePreference('sidebarCollapsed', next).catch((error) => {
      console.error('Failed to save sidebar preference:', error);
    });
  };

  return (
    <div className="container-fluid overflow-x-hidden merdeka-sidebar-content">
      <div className="navbar-brand navbar-brand-autodark">
        <div className="d-flex align-items-center px-2 pt-2 sidebar-header">
          <Link
            to="/dashboard"
            aria-label="MTI Onboarding dashboard"
            onClick={onClose}
          >
            <img
              id="sidebarLogo"
              src={
                collapsed
                  ? '/merdeka/branding/mbm-symbol.svg'
                  : '/merdeka/branding/mbm-logo.svg'
              }
              alt="Merdeka Battery Materials"
            />
          </Link>
          {onClose ? (
            <button
              className="merdeka-icon-button"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          ) : (
            <button
              id="sidebarControl"
              className="merdeka-icon-button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="21"
                viewBox="0 0 20 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.875 10.7727C11.875 11.8083 11.0355 12.6477 10 12.6477C8.96447 12.6477 8.125 11.8083 8.125 10.7727C8.125 9.7372 8.96447 8.89774 10 8.89774C11.0355 8.89774 11.875 9.7372 11.875 10.7727Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M16.0417 10.7727C16.0417 14.1095 13.3367 16.8144 9.99999 16.8144C6.66327 16.8144 3.95833 14.1095 3.95833 10.7727C3.95833 7.43601 6.66327 4.73106 9.99999 4.73106C13.3367 4.73106 16.0417 7.43601 16.0417 10.7727Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
          )}
        </div>
      </div>
      <nav aria-label="Main navigation">
        <ul className="navbar-nav py-lg-3">
          {items.map((item) => {
            const active =
              pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <li
                className={`nav-item${active ? ' active-mdka-nav' : ''}`}
                key={item.path}
              >
                <Link
                  className={`nav-link${active ? ' active' : ''}`}
                  to={item.path}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-link-icon">
                    {item.path === '/dashboard' ? (
                      <svg
                        className="icon icon-tabler icon-tabler-dashboard"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M5.62516 16.5872H14.3752C15.2956 16.5872 16.0418 15.8411 16.0418 14.9206V8.67057L10.0002 4.50391L3.9585 8.67057V14.9206C3.9585 15.8411 4.70469 16.5872 5.62516 16.5872Z"></path>
                        <path d="M8.12465 13.6698C8.12465 12.7493 8.87085 12.0031 9.79132 12.0031H10.208C11.1285 12.0031 11.8747 12.7493 11.8747 13.6698V16.5864H8.12465V13.6698Z"></path>
                      </svg>
                    ) : (
                      <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="nav-link-title sidebar-control">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <img
        className="sidebar-background"
        src="/merdeka/branding/mbm-symbol.svg"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
