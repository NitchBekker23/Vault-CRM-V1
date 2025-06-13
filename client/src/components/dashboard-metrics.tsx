import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  progress?: number;
  color: 'blue' | 'yellow' | 'dark';
  icon: string;
}

function MetricCard({ title, value, subtitle, progress, color, icon }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500', 
    dark: 'bg-slate-800'
  };

  const progressColorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    dark: 'bg-slate-800'
  };

  return (
    <Card className="p-6 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
          <div className="flex items-center space-x-4">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {progress !== undefined && (
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke={color === 'blue' ? '#3b82f6' : color === 'yellow' ? '#eab308' : '#1e293b'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 1.76} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold">{progress}%</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>
        
        <div className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center`}>
          <i className={`${icon} text-white text-lg`}></i>
        </div>
      </div>
    </Card>
  );
}

interface DashboardMetricsProps {
  metrics: {
    totalInventory: number;
    inStock: number;
    reserved: number;
    wishlistRequests: number;
    salesThisMonth: number;
  };
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const totalClients = 6; // This would come from actual client data
  const monthlyRevenue = 0; // This would come from actual sales data
  const vipClients = 3; // This would come from actual VIP client data

  const clientProgress = Math.round((totalClients / 10) * 100); // Assuming goal of 10 clients
  const revenueProgress = Math.round((monthlyRevenue / 10000) * 100); // Assuming goal of R10,000
  const vipProgress = Math.round((vipClients / 5) * 100); // Assuming goal of 5 VIP clients

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <MetricCard
        title="Total Clients"
        value={totalClients}
        subtitle={`+12% from last month`}
        progress={clientProgress}
        color="blue"
        icon="fas fa-users"
      />
      
      <MetricCard
        title="Monthly Revenue"
        value={`R ${monthlyRevenue.toFixed(2)}`}
        subtitle={`+5% from last month`}
        progress={revenueProgress}
        color="yellow"
        icon="fas fa-chart-line"
      />
      
      <MetricCard
        title="VIP Clients"
        value={vipClients}
        subtitle={`+20% from last month`}
        progress={vipProgress}
        color="dark"
        icon="fas fa-crown"
      />
    </div>
  );
}