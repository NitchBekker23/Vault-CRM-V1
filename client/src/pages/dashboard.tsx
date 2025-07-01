import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import DashboardMetrics from "@/components/dashboard-metrics";
import QuickActions from "@/components/quick-actions";
import RecentActivity from "@/components/recent-activity";
import InventoryTable from "@/components/inventory-table";
import MobileTestOverlay from "@/components/mobile-test-overlay";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();

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

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    refetchInterval: 10 * 60 * 1000, // Reduced frequency to 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minute stale time
    gcTime: 15 * 60 * 1000, // 15 minute garbage collection time
    refetchOnWindowFocus: false,
    retry: 2,
  });

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
        <DashboardMetrics metrics={metrics} metricsLoading={metricsLoading} />

        <div className={`grid ${
          screenSize === 'mobile' 
            ? 'grid-cols-1 gap-4' 
            : screenSize === 'tablet'
            ? 'grid-cols-1 gap-5'
            : 'grid-cols-1 lg:grid-cols-2 gap-6'
        }`}>
          <QuickActions />
          <RecentActivity />
        </div>

        <InventoryTable 
          showHeader={true} 
          limit={screenSize === 'mobile' ? 5 : 10} 
          allowBulkActions={false} 
        />
      </div>

      {/* Mobile Test Overlay - Only show in development */}
      {process.env.NODE_ENV === 'development' && <MobileTestOverlay />}
    </div>
  );
}