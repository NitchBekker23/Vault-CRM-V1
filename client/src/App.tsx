import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { useWebVitals } from "@/hooks/useWebVitals";
import { Suspense, lazy } from "react";
import { TableSkeleton, CardSkeleton } from "@/components/ui/loading-skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";

// Direct imports for consistent UI rendering
import Inventory from "@/pages/inventory";
import Clients from "@/pages/clients";
import Sales from "@/pages/sales";
import SalesManagement from "@/pages/sales-management";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import BulkUpload from "@/pages/bulk-upload";
import UserManagement from "@/pages/user-management";
import AdminUsers from "@/pages/admin-users";
import UserProfile from "@/pages/user-profile";
import Wishlist from "@/pages/wishlist";
import RequestAccount from "@/pages/request-account";
import SetupAccount from "@/pages/setup-account";
import TwoFactorLogin from "@/pages/two-factor-login";
import TestLogin from "@/pages/test-login";
import Performance from "@/pages/performance";
import PerformanceDemo from "@/pages/performance-demo";
import PerformanceSimple from "@/pages/performance-simple";
import PerformanceDirect from "@/pages/performance-direct";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminLogin from "@/pages/admin-login";
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
        <Route path="/performance-demo" component={PerformanceDemo} />
        <Route path="/performance-simple" component={PerformanceSimple} />
        <Route path="/performance-direct" component={PerformanceDirect} />
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
        <Switch>
            <Route path="/" component={() => (
              <Suspense fallback={<CardSkeleton />}>
                <Dashboard />
              </Suspense>
            )} />
            <Route path="/inventory" component={() => (
              <Suspense fallback={<TableSkeleton rows={8} />}>
                <Inventory />
              </Suspense>
            )} />
            <Route path="/wishlist" component={() => (
              <Suspense fallback={<TableSkeleton rows={5} />}>
                <Wishlist />
              </Suspense>
            )} />
            <Route path="/clients" component={() => (
              <Suspense fallback={<TableSkeleton rows={6} />}>
                <Clients />
              </Suspense>
            )} />
            <Route path="/sales" component={() => (
              <Suspense fallback={<div className="p-6"><TableSkeleton rows={10} /></div>}>
                <Sales />
              </Suspense>
            )} />
            <Route path="/sales-management" component={() => (
              <Suspense fallback={<TableSkeleton rows={7} />}>
                <SalesManagement />
              </Suspense>
            )} />
            <Route path="/analytics" component={() => (
              <Suspense fallback={<div className="p-6 space-y-4"><CardSkeleton /><CardSkeleton /></div>}>
                <Analytics />
              </Suspense>
            )} />
            <Route path="/performance" component={() => (
              <Suspense fallback={<div className="p-6 space-y-6"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}>
                <Performance />
              </Suspense>
            )} />
            <Route path="/settings" component={() => (
              <Suspense fallback={<CardSkeleton />}>
                <Settings />
              </Suspense>
            )} />
            <Route path="/bulk-upload" component={() => (
              <Suspense fallback={<CardSkeleton />}>
                <BulkUpload />
              </Suspense>
            )} />
            <Route path="/user-management" component={() => (
              <Suspense fallback={<TableSkeleton rows={4} />}>
                <UserManagement />
              </Suspense>
            )} />
            {((user as any)?.role === 'admin' || (user as any)?.role === 'owner' || (user as any)?.email === 'nitchbekker@gmail.com') && (
              <>
                <Route path="/admin/users" component={AdminUsers} />
                <Route path="/admin/users/:userId" component={UserProfile} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
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
