import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NewOrderView } from './components/NewOrderView';
import { ServicesView } from './components/ServicesView';
import { OrdersView } from './components/OrdersView';
import { AddFundsKhqr } from './components/AddFundsKhqr';
import { AdminDashboard } from './components/AdminDashboard';
import { ApiDocs } from './components/ApiDocs';
import { TicketsPage } from './components/TicketsPage';
import { TermsView, FAQView, AffiliatesView } from './components/InfoViews';
import { UserSettingsView } from './components/UserSettingsView';
import { FooterBanner } from './components/FooterBanner';
import { OrderModal } from './components/OrderModal';
import { TicketModal } from './components/TicketModal';
import { AuthPage } from './components/AuthPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { NotificationToast } from './components/NotificationToast';
import { PublicNavbar } from './components/PublicNavbar';
import { PublicHomeView } from './components/PublicHomeView';
import { PublicServicesView } from './components/PublicServicesView';
import { api } from './services/api';
import { ServiceItem } from './components/ServicesTable';
import { Bell } from 'lucide-react';
import './styles/index.css';
import './styles/components.css';
import './styles/public.css';
import './styles/admin.css';

// =========================================================================
// 1. AUTHENTICATED USER DASHBOARD LAYOUT (Image 2 - ONLY FOR LOGGED IN USERS)
// =========================================================================
interface MainLayoutProps {
  initialPage?: string;
  activePageProp?: string;
  onNavigate: (path: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  initialPage = 'new-order',
  activePageProp,
  onNavigate,
}) => {
  const { isAdmin, logout } = useAuth();
  const [activePage, setActivePage] = useState<string>(activePageProp || initialPage);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Modals state
  const [selectedServiceForOrder, setSelectedServiceForOrder] = useState<ServiceItem | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    if (activePageProp) {
      setActivePage(activePageProp);
    }
  }, [activePageProp]);

  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const data = await api.services.getServices();
      if (data.success) {
        setServices(data.services || []);
        if (data.categories) setCategories(data.categories);
        if (data.platforms) setPlatforms(data.platforms);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleNavPage = (page: string) => {
    setActivePage(page);
    onNavigate(`/${page}`);
  };

  return (
    <div className="app-container">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => handleNavPage(page)}
        openTicketModal={() => setIsTicketModalOpen(true)}
        onNavigate={onNavigate}
      />

      {/* 2. Main Content Wrapper */}
      <div className="main-wrapper">
        {/* Top Stats Bar with User Profile & Portal Navigation */}
        <TopBar
          openDepositModal={() => handleNavPage('add-funds')}
          onNavigate={onNavigate}
        />

        {/* Content Body */}
        <main className="content-body">
          {/* New Order View */}
          {activePage === 'new-order' && (
            <NewOrderView
              services={services}
              categories={categories}
              initialTab="new-order"
              onOrderSuccess={() => handleNavPage('orders')}
              openAuthModal={() => onNavigate('/login')}
              openDepositModal={() => handleNavPage('add-funds')}
            />
          )}

          {/* Mass Order View */}
          {activePage === 'mass-order' && (
            <NewOrderView
              services={services}
              categories={categories}
              initialTab="mass-order"
              onOrderSuccess={() => handleNavPage('orders')}
              openAuthModal={() => onNavigate('/login')}
              openDepositModal={() => handleNavPage('add-funds')}
            />
          )}

          {/* Services View */}
          {activePage === 'services' && (
            <ServicesView
              services={services}
              categories={categories}
              platforms={platforms}
              isLoading={isLoadingServices}
              onSelectService={(s) => setSelectedServiceForOrder(s)}
            />
          )}

          {/* Orders View */}
          {activePage === 'orders' && <OrdersView />}

          {/* Add Funds (Bakong KHQR) */}
          {activePage === 'add-funds' && <AddFundsKhqr />}

          {/* FAQ */}
          {activePage === 'faq' && <FAQView />}

          {/* API Reseller Docs */}
          {activePage === 'api' && <ApiDocs />}

          {/* Tickets Support Page */}
          {activePage === 'tickets' && (
            <TicketsPage openAuthModal={() => onNavigate('/login')} />
          )}

          {/* Terms */}
          {activePage === 'terms' && <TermsView />}

          {/* Affiliates */}
          {activePage === 'affiliates' && <AffiliatesView />}

          {/* Account Settings */}
          {activePage === 'settings' && <UserSettingsView />}

          {/* Admin Control Center */}
          {activePage === 'admin' && isAdmin && <AdminDashboard />}
        </main>

        {/* 3. Dark Navy Footer Banner */}
        <FooterBanner onOpenTicket={() => handleNavPage('tickets')} />
      </div>

      {/* Floating Notification Bell Button */}
      <button
        className="floating-bell-btn"
        title="Support & Notifications"
        onClick={() => handleNavPage('tickets')}
      >
        <Bell size={20} />
      </button>

      {/* Order Modal (for one-click order from Services table) */}
      <OrderModal
        service={selectedServiceForOrder}
        isOpen={!!selectedServiceForOrder}
        onClose={() => setSelectedServiceForOrder(null)}
        onOrderSuccess={() => {
          setSelectedServiceForOrder(null);
          handleNavPage('orders');
        }}
        openDepositModal={() => handleNavPage('add-funds')}
        openAuthModal={() => onNavigate('/login')}
      />

      {/* Support Ticket Modal */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

      {/* Global Notifications */}
      <NotificationToast />
    </div>
  );
};

// =========================================================================
// 2. PUBLIC STOREFRONT LAYOUT (FOR GUESTS / VISITORS NOT LOGGED IN)
// =========================================================================
interface PublicLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ currentPath, onNavigate }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');

  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const data = await api.services.getServices();
      if (data.success) {
        setServices(data.services || []);
        if (data.categories) setCategories(data.categories);
        if (data.platforms) setPlatforms(data.platforms);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const activePage = currentPath.replace(/^\//, '') || 'home';

  return (
    <div className="public-layout-root">
      {/* 1. Top Public Navbar with Home, Services, API, FAQ, Terms, Sign In, Sign Up */}
      <PublicNavbar activePage={activePage} onNavigate={onNavigate} />

      {/* 2. Main Public Content Body */}
      <main className="public-main-content">
        {(activePage === 'home' || activePage === '') && (
          <PublicHomeView
            onExploreServices={() => onNavigate('/services')}
            onSignUp={() => onNavigate('/signup')}
            onSelectPlatform={(plat) => {
              setSelectedPlatform(plat);
              onNavigate('/services');
            }}
            selectedPlatform={selectedPlatform}
          />
        )}

        {activePage === 'services' && (
          <PublicServicesView
            services={services}
            categories={categories}
            platforms={platforms}
            isLoading={isLoadingServices}
            onSignUp={() => onNavigate('/signup')}
            onSignIn={() => onNavigate('/login')}
          />
        )}

        {activePage === 'api' && (
          <div style={{ maxWidth: 1200, margin: '30px auto', padding: '0 24px' }}>
            <ApiDocs />
          </div>
        )}

        {activePage === 'faq' && (
          <div style={{ maxWidth: 1000, margin: '30px auto', padding: '0 24px' }}>
            <FAQView />
          </div>
        )}

        {activePage === 'terms' && (
          <div style={{ maxWidth: 1000, margin: '30px auto', padding: '0 24px' }}>
            <TermsView />
          </div>
        )}
      </main>

      {/* 3. Public Footer */}
      <FooterBanner onOpenTicket={() => onNavigate('/login')} />

      {/* Global Notifications */}
      <NotificationToast />
    </div>
  );
};

// =========================================================================
// 3. MAIN ROUTER APP
// =========================================================================
const RouterApp: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    return p && p !== '/' ? p : '/';
  });

  const navigate = useCallback((targetPath: string) => {
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    if (window.location.pathname !== cleanPath) {
      window.history.pushState({}, '', cleanPath);
    }
    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Dedicated User Login Page (Redesigned SMM panel style)
  if (currentPath === '/login') {
    if (isAuthenticated) {
      return <MainLayout initialPage="new-order" onNavigate={navigate} />;
    }
    return <AuthPage initialMode="login" onNavigate={navigate} />;
  }

  // 2. Dedicated User Signup Page (Redesigned SMM panel style)
  if (currentPath === '/signup') {
    if (isAuthenticated) {
      return <MainLayout initialPage="new-order" onNavigate={navigate} />;
    }
    return <AuthPage initialMode="signup" onNavigate={navigate} />;
  }

  // 3. Dedicated Admin Login Portal
  if (currentPath === '/admin/login') {
    return <AdminLoginPage onNavigate={navigate} />;
  }

  // 4. Admin Dashboard Route Protection
  if (currentPath === '/admin') {
    if (!isAdmin) {
      return <AdminLoginPage onNavigate={navigate} />;
    }
    return <MainLayout activePageProp="admin" onNavigate={navigate} />;
  }

  // 5. User Settings route protection
  if (currentPath === '/settings' && !isAuthenticated) {
    return <AuthPage initialMode="login" onNavigate={navigate} />;
  }

  // 6. If User IS Authenticated (Logged In) -> Show Full User Dashboard with Sidebar
  if (isAuthenticated) {
    const pageFromPath = currentPath.replace(/^\//, '') || 'new-order';
    return <MainLayout initialPage={pageFromPath} onNavigate={navigate} />;
  }

  // 6. If User is NOT Logged In (Guest) -> Show Public Storefront with Public Navbar (NO sidebar)
  const validPublicPaths = ['/', '/home', '/services', '/api', '/faq', '/terms'];
  const cleanPath = currentPath === '/' ? '/home' : currentPath;

  if (validPublicPaths.includes(currentPath) || currentPath === '/') {
    return <PublicLayout currentPath={cleanPath} onNavigate={navigate} />;
  }

  // If unauthenticated guest attempts to access user-only routes (/new-order, /orders, /add-funds, etc.)
  return <AuthPage initialMode="login" onNavigate={navigate} />;
};

export default function App() {
  return (
    <AuthProvider>
      <RouterApp />
    </AuthProvider>
  );
}
