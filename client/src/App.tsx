import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { useWebVitals } from "@/hooks/useWebVitals";
import { Suspense, lazy } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";

// Lazy load heavy components for better performance
const Inventory = lazy(() => import("@/pages/inventory"));
const Clients = lazy(() => import("@/pages/clients"));
const Sales = lazy(() => import("@/pages/sales"));
const SalesManagement = lazy(() => import("@/pages/sales-management"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Settings = lazy(() => import("@/pages/settings"));
const BulkUpload = lazy(() => import("@/pages/bulk-upload"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const AdminUsers = lazy(() => import("@/pages/admin-users"));
const UserProfile = lazy(() => import("@/pages/user-profile"));
const Wishlist = lazy(() => import("@/pages/wishlist"));
const RequestAccount = lazy(() => import("@/pages/request-account"));
const SetupAccount = lazy(() => import("@/pages/setup-account"));
const TwoFactorLogin = lazy(() => import("@/pages/two-factor-login"));
const TestLogin = lazy(() => import("@/pages/test-login"));
const Register = lazy(() => import("@/pages/register"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
import Sidebar from "@/components/sidebar";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();

  // Initialize Web Vitals monitoring for performance tracking
  useWebVitals({
    onFCP: (metric) => {
      if (metric.value > 1800) {
        console.warn('Poor First Contentful Paint performance detected');
      }
    },
    onLCP: (metric) => {
      if (metric.value > 2500) {
        console.warn('Poor Largest Contentful Paint performance detected');
      }
    },
    onTTFB: (metric) => {
      if (metric.value > 800) {
        console.warn('Poor Time to First Byte performance detected');
      }
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login, register, or other auth pages
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin-access" component={AdminLogin} />
        <Route path="/request-account" component={RequestAccount} />
        <Route path="/setup-account" component={SetupAccount} />
        <Route path="/2fa-login" component={TwoFactorLogin} />
        <Route path="/test-login" component={TestLogin} />
        <Route path="/" component={Login} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated but account not approved
  if (user && (user as any).status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Account Pending</h2>
          {(user as any).status === 'pending' && (
            <p className="text-gray-600 mb-4">
              Your account request is being reviewed. You'll receive an email when it's approved.
            </p>
          )}
          {(user as any).status === 'denied' && (
            <p className="text-gray-600 mb-4">
              Your account request has been denied. Please contact an administrator for more information.
            </p>
          )}
          {(user as any).status === 'suspended' && (
            <p className="text-gray-600 mb-4">
              Your account has been suspended. Please contact an administrator.
            </p>
          )}
          <a href="/api/logout" className="text-blue-600 hover:underline">
            Sign out
          </a>
        </div>
      </div>
    );
  }

  // Authenticated and approved - show full application
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${
        screenSize === 'mobile' 
          ? 'ml-0 w-full min-w-0' 
          : screenSize === 'tablet'
          ? 'ml-0 w-full min-w-0'
          : 'ml-64'
      }`}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        }>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/clients" component={Clients} />
            <Route path="/sales" component={Sales} />
            <Route path="/sales-management" component={SalesManagement} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings" component={Settings} />
            <Route path="/bulk-upload" component={BulkUpload} />
            <Route path="/user-management" component={UserManagement} />
            {((user as any)?.role === 'admin' || (user as any)?.role === 'owner' || (user as any)?.email === 'nitchbekker@gmail.com') && (
              <>
                <Route path="/admin/users" component={AdminUsers} />
                <Route path="/admin/users/:userId" component={UserProfile} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
