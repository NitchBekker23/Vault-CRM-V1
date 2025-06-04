import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, Heart, TrendingUp, ArrowUp } from "lucide-react";

export default function MetricsCards() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Inventory",
      value: metrics?.totalInventory || 0,
      icon: Package,
      color: "primary",
      trend: "+12%",
      trendLabel: "vs last month",
    },
    {
      title: "In Stock",
      value: metrics?.inStock || 0,
      icon: CheckCircle,
      color: "success",
      percentage: metrics?.totalInventory ? 
        Math.round((metrics.inStock / metrics.totalInventory) * 100) : 0,
    },
    {
      title: "Wishlist Requests",
      value: metrics?.wishlistRequests || 0,
      icon: Heart,
      color: "warning",
      trend: "+8%",
      trendLabel: "new this week",
    },
    {
      title: "Sales This Month",
      value: `$${(metrics?.salesThisMonth || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "success",
      trend: "+23%",
      trendLabel: "vs last month",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`h-12 w-12 bg-${card.color}/10 rounded-lg flex items-center justify-center`}>
                <card.icon className={`text-${card.color} w-6 h-6`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {card.trend && (
                <>
                  <span className="text-success flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    {card.trend}
                  </span>
                  <span className="text-slate-500 ml-2">{card.trendLabel}</span>
                </>
              )}
              {card.percentage !== undefined && (
                <span className="text-slate-500">{card.percentage}% of total inventory</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
