import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Wishlist from "@/pages/wishlist";
import Clients from "@/pages/clients";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import BulkUpload from "@/pages/bulk-upload";
import UserManagement from "@/pages/user-management";
import RequestAccount from "@/pages/request-account";
import AdminUsers from "@/pages/admin-users";
import SetupAccount from "@/pages/setup-account";
import TwoFactorLogin from "@/pages/two-factor-login";
import TestLogin from "@/pages/test-login";
import Sidebar from "@/components/sidebar";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();

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

  // Not authenticated - show landing, request account, setup, or 2FA
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/request-account" component={RequestAccount} />
        <Route path="/setup-account" component={SetupAccount} />
        <Route path="/2fa-login" component={TwoFactorLogin} />
        <Route path="/test-login" component={TestLogin} />
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated but account not approved
  if (user && user.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Account Pending</h2>
          {user.status === 'pending' && (
            <p className="text-gray-600 mb-4">
              Your account request is being reviewed. You'll receive an email when it's approved.
            </p>
          )}
          {user.status === 'denied' && (
            <p className="text-gray-600 mb-4">
              Your account request has been denied. Please contact an administrator for more information.
            </p>
          )}
          {user.status === 'suspended' && (
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
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className={`flex-1 ${isMobile ? 'ml-0 w-full' : 'ml-64'} transition-all duration-300 ${isMobile ? 'min-w-0' : ''}`}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/wishlist" component={Wishlist} />
          <Route path="/clients" component={Clients} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/bulk-upload" component={BulkUpload} />
          <Route path="/user-management" component={UserManagement} />
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Route path="/admin/users" component={AdminUsers} />
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
