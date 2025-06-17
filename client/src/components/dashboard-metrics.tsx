import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

interface Metrics {
  totalInventory: number;
  inStock: number;
  reserved: number;
  sold: number;
  wishlistRequests: number;
  salesThisMonth: number;
}

export default function DashboardMetrics() {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ["/api/dashboard/metrics"],
  });
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'} mb-6`}>
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className={isMobile ? "p-4" : "p-6"}>
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
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'} mb-6`}>
      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center ${isMobile ? 'flex-col text-center space-y-3' : 'justify-between'}`}>
            <div className={isMobile ? 'order-2' : ''}>
              <p className="text-sm font-medium text-slate-600">Total Inventory</p>
              <p className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {metrics?.totalInventory || 0}
              </p>
            </div>
            <div className={`bg-blue-100 rounded-lg flex items-center justify-center ${isMobile ? 'h-10 w-10 order-1' : 'h-12 w-12'}`}>
              <i className="fas fa-boxes text-blue-600"></i>
            </div>
          </div>
          <div className={`flex items-center text-sm ${isMobile ? 'mt-3 justify-center' : 'mt-4'}`}>
            <span className="text-green-600 flex items-center">
              <i className="fas fa-arrow-up mr-1"></i>
              12%
            </span>
            <span className="text-slate-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center ${isMobile ? 'flex-col text-center space-y-3' : 'justify-between'}`}>
            <div className={isMobile ? 'order-2' : ''}>
              <p className="text-sm font-medium text-slate-600">In Stock</p>
              <p className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {metrics?.inStock || 0}
              </p>
            </div>
            <div className={`bg-green-100 rounded-lg flex items-center justify-center ${isMobile ? 'h-10 w-10 order-1' : 'h-12 w-12'}`}>
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
          <div className={`text-sm ${isMobile ? 'mt-3 text-center' : 'mt-4'}`}>
            <span className="text-slate-500">
              {metrics?.totalInventory ? 
                Math.round((metrics.inStock / metrics.totalInventory) * 100) : 0}% of total inventory
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center ${isMobile ? 'flex-col text-center space-y-3' : 'justify-between'}`}>
            <div className={isMobile ? 'order-2' : ''}>
              <p className="text-sm font-medium text-slate-600">Sold</p>
              <p className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {metrics?.sold || 0}
              </p>
            </div>
            <div className={`bg-red-100 rounded-lg flex items-center justify-center ${isMobile ? 'h-10 w-10 order-1' : 'h-12 w-12'}`}>
              <i className="fas fa-check text-red-600"></i>
            </div>
          </div>
          <div className={`text-sm ${isMobile ? 'mt-3 text-center' : 'mt-4'}`}>
            <span className="text-slate-500">
              {metrics?.totalInventory ? 
                Math.round((metrics.sold / metrics.totalInventory) * 100) : 0}% of total inventory
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center ${isMobile ? 'flex-col text-center space-y-3' : 'justify-between'}`}>
            <div className={isMobile ? 'order-2' : ''}>
              <p className="text-sm font-medium text-slate-600">Wishlist Requests</p>
              <p className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {metrics?.wishlistRequests || 0}
              </p>
            </div>
            <div className={`bg-orange-100 rounded-lg flex items-center justify-center ${isMobile ? 'h-10 w-10 order-1' : 'h-12 w-12'}`}>
              <i className="fas fa-heart text-orange-600"></i>
            </div>
          </div>
          <div className={`flex items-center text-sm ${isMobile ? 'mt-3 justify-center' : 'mt-4'}`}>
            <span className="text-green-600 flex items-center">
              <i className="fas fa-arrow-up mr-1"></i>
              8%
            </span>
            <span className="text-slate-500 ml-2">new this week</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center ${isMobile ? 'flex-col text-center space-y-3' : 'justify-between'}`}>
            <div className={isMobile ? 'order-2' : ''}>
              <p className="text-sm font-medium text-slate-600">Sales This Month</p>
              <p className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                R{(metrics?.salesThisMonth || 0).toLocaleString()}
              </p>
            </div>
            <div className={`bg-green-100 rounded-lg flex items-center justify-center ${isMobile ? 'h-10 w-10 order-1' : 'h-12 w-12'}`}>
              <i className="fas fa-chart-line text-green-600"></i>
            </div>
          </div>
          <div className={`flex items-center text-sm ${isMobile ? 'mt-3 justify-center' : 'mt-4'}`}>
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
