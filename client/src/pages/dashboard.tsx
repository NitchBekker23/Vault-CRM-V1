import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import DashboardMetrics from "@/components/dashboard-metrics";
import EnhancedActivityFeed from "@/components/enhanced-activity-feed";
import TopClients from "@/components/top-clients";
import SalesAnalytics from "@/components/sales-analytics";
import UpcomingEvents from "@/components/upcoming-events";
import MobileTestOverlay from "@/components/mobile-test-overlay";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();

  // Fetch dashboard data
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["/api/activities/recent"],
  });

  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="Dashboard" />
      <div className={`${
        screenSize === 'mobile' 
          ? 'p-4 space-y-4 max-w-full overflow-x-hidden' 
          : screenSize === 'tablet'
          ? 'p-5 space-y-5'
          : 'p-6 space-y-6'
      }`}>
        {/* Welcome Message */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back, Emily! Here's what's happening today.</h1>
        </div>

        {/* Metrics Cards */}
        {metrics && <DashboardMetrics metrics={metrics} />}
        
        {/* Main Content Grid */}
        <div className={`grid ${
          screenSize === 'mobile' 
            ? 'grid-cols-1 gap-4' 
            : screenSize === 'tablet'
            ? 'grid-cols-1 lg:grid-cols-2 gap-5'
            : 'grid-cols-1 lg:grid-cols-3 gap-6'
        }`}>
          {/* Left Column - Activity Feed */}
          <div className={screenSize === 'desktop' ? 'lg:col-span-2' : ''}>
            <div className="grid grid-cols-1 gap-6">
              <EnhancedActivityFeed activities={activitiesData || []} />
              <SalesAnalytics />
            </div>
          </div>

          {/* Right Column - Clients & Events */}
          <div className="space-y-6">
            <TopClients clients={clientsData?.clients || []} />
            <UpcomingEvents />
          </div>
        </div>
      </div>
      
      {/* Mobile Test Overlay - Only show in development */}
      {process.env.NODE_ENV === 'development' && <MobileTestOverlay />}
    </div>
  );
}
