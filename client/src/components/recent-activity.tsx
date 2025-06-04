import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLog } from "@shared/schema";

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activities/recent"],
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "added_item":
        return "fas fa-plus text-green-600";
      case "sold_item":
        return "fas fa-check text-blue-600";
      case "updated_item":
        return "fas fa-edit text-orange-600";
      case "deleted_item":
        return "fas fa-trash text-red-600";
      case "wishlist_request":
        return "fas fa-heart text-red-600";
      default:
        return "fas fa-info text-slate-500";
    }
  };

  const getActivityIconBg = (action: string) => {
    switch (action) {
      case "added_item":
        return "bg-green-100";
      case "sold_item":
        return "bg-blue-100";
      case "updated_item":
        return "bg-orange-100";
      case "deleted_item":
        return "bg-red-100";
      case "wishlist_request":
        return "bg-red-100";
      default:
        return "bg-slate-100";
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    return `${diffInDays} days ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${getActivityIconBg(activity.action)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <i className={`${getActivityIcon(activity.action)} text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{activity.description}</p>
                  <p className="text-xs text-slate-500">{getTimeAgo(activity.createdAt!)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-clock text-4xl text-slate-300 mb-4"></i>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No recent activity</h3>
            <p className="text-slate-500">Activity will appear here as you use the system.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
