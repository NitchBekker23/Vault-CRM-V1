import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Heart, CheckCircle, Upload } from "lucide-react";
import type { ActivityLog } from "@shared/schema";

const activityIcons = {
  added: Plus,
  updated: CheckCircle,
  sold: CheckCircle,
  wishlist_added: Heart,
  deleted: Upload,
} as const;

const activityColors = {
  added: "success",
  updated: "primary",
  sold: "primary",
  wishlist_added: "warning",
  deleted: "slate",
} as const;

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: ActivityLog) => {
              const Icon = activityIcons[activity.action as keyof typeof activityIcons] || Plus;
              const color = activityColors[activity.action as keyof typeof activityColors] || "slate";
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 bg-${color}/10 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`text-${color} w-4 h-4`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{activity.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
