import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Metrics {
  totalInventory: number;
  inStock: number;
  wishlistRequests: number;
  salesThisMonth: number;
}

export default function DashboardMetrics() {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Inventory</p>
              <p className="text-2xl font-bold text-slate-900">{metrics?.totalInventory || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-boxes text-blue-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 flex items-center">
              <i className="fas fa-arrow-up mr-1"></i>
              12%
            </span>
            <span className="text-slate-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">In Stock</p>
              <p className="text-2xl font-bold text-slate-900">{metrics?.inStock || 0}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500">
              {metrics?.totalInventory ? 
                Math.round((metrics.inStock / metrics.totalInventory) * 100) : 0}% of total inventory
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Wishlist Requests</p>
              <p className="text-2xl font-bold text-slate-900">{metrics?.wishlistRequests || 0}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-heart text-orange-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 flex items-center">
              <i className="fas fa-arrow-up mr-1"></i>
              8%
            </span>
            <span className="text-slate-500 ml-2">new this week</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Sales This Month</p>
              <p className="text-2xl font-bold text-slate-900">
                ${(metrics?.salesThisMonth || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-green-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 flex items-center">
              <i className="fas fa-arrow-up mr-1"></i>
              23%
            </span>
            <span className="text-slate-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
