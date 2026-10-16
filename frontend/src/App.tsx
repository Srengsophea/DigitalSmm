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
import { FAQView, ChildPanelView, TermsView, AffiliatesView } from './components/InfoViews';
import { FooterBanner } from './components/FooterBanner';
import { OrderModal } from './components/OrderModal';
import { TicketModal } from './components/TicketModal';
import { AuthPage } from './components/AuthPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { NotificationToast } from './components/NotificationToast';
import { api } from './services/api';
import { ServiceItem } from './components/ServicesTable';
import { Bell } from 'lucide-react';
import './styles/index.css';
import './styles/components.css';

interface MainLayoutProps {
  initialPage?: string;
  activePageProp?: string;
  onNavigate: (path: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  initialPage = 'services',
  activePageProp,
  onNavigate,
}) => {
  const { isAdmin } = useAuth();
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

          {/* Child Panel ($3 Monthly) */}
          {activePage === 'child-panel' && <ChildPanelView />}

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

const RouterApp: React.FC = () => {
  const { isAdmin } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    return p && p !== '/' ? p : '/services';
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
      setCurrentPath(p && p !== '/' ? p : '/services');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Dedicated User Login Page
  if (currentPath === '/login') {
    return <AuthPage initialMode="login" onNavigate={navigate} />;
  }

  // 2. Dedicated User Signup Page
  if (currentPath === '/signup') {
    return <AuthPage initialMode="signup" onNavigate={navigate} />;
  }

  // 3. Dedicated Admin Login Portal (Different access from user)
  if (currentPath === '/admin/login') {
    return <AdminLoginPage onNavigate={navigate} />;
  }

  // 4. Admin Dashboard Route Protection
  if (currentPath === '/admin') {
    if (!isAdmin) {
      // Redirect unauthenticated or non-admin users to the Admin Login Portal
      return <AdminLoginPage onNavigate={navigate} />;
    }
    return <MainLayout activePageProp="admin" onNavigate={navigate} />;
  }

  // 5. General Storefront & SMM Routes
  const pageFromPath = currentPath.replace(/^\//, '') || 'services';
  return <MainLayout initialPage={pageFromPath} onNavigate={navigate} />;
};

export default function App() {
  return (
    <AuthProvider>
      <RouterApp />
    </AuthProvider>
  );
}
