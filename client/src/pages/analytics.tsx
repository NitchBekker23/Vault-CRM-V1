import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
    <>
      <Header title="Analytics & Reports" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-chart-line text-primary"></i>
                <span>Sales Analytics</span>
              </CardTitle>
              <CardDescription>Track sales performance and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Detailed sales analytics features will be implemented here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-chart-pie text-primary"></i>
                <span>Inventory Reports</span>
              </CardTitle>
              <CardDescription>Inventory distribution and status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Inventory analytics and reporting features will be implemented here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-chart-bar text-primary"></i>
                <span>Demand Analysis</span>
              </CardTitle>
              <CardDescription>Wishlist and demand patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Demand tracking and analysis features will be implemented here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
