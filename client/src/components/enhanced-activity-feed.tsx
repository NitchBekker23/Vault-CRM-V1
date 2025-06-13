import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: number;
  description: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  };
}

interface EnhancedActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  showViewAll?: boolean;
}

function getActivityIcon(action: string): string {
  switch (action.toLowerCase()) {
    case 'created':
    case 'added':
      return 'fas fa-plus-circle text-green-500';
    case 'updated':
    case 'modified':
      return 'fas fa-edit text-blue-500';
    case 'deleted':
    case 'removed':
      return 'fas fa-trash text-red-500';
    case 'purchased':
    case 'bought':
      return 'fas fa-shopping-cart text-purple-500';
    case 'sold':
      return 'fas fa-dollar-sign text-green-600';
    default:
      return 'fas fa-circle text-slate-400';
  }
}

function formatActivityText(activity: ActivityItem): JSX.Element {
  const { action, entityType, description } = activity;
  
  if (description && description.includes('VIP client')) {
    return (
      <span>
        has been added as a <span className="font-semibold text-yellow-600">VIP client</span>
      </span>
    );
  }
  
  if (description && description.includes('newsletter')) {
    return (
      <span>
        <span className="font-semibold">Newsletter</span> subscription updated
      </span>
    );
  }
  
  if (entityType === 'inventory_item' && action === 'added_item') {
    return (
      <span>
        added a new <span className="font-semibold text-blue-600">{description || 'item'}</span> to inventory
      </span>
    );
  }
  
  return (
    <span>
      {action.replace('_', ' ')} - <span className="font-semibold">{description}</span>
    </span>
  );
}

function getUserDisplayName(user: ActivityItem['user']): string {
  if (!user) return 'Unknown User';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email.split('@')[0];
}

function getUserInitials(user: ActivityItem['user']): string {
  if (!user) return 'U';
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`;
  }
  const emailName = user.email.split('@')[0];
  return emailName.slice(0, 2).toUpperCase();
}

export default function EnhancedActivityFeed({ 
  activities, 
  title = "Recent Activity",
  showViewAll = true 
}: EnhancedActivityFeedProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {showViewAll && (
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <i className="fas fa-clock text-2xl mb-2"></i>
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {activity.user?.profileImageUrl ? (
                  <img
                    src={activity.user.profileImageUrl}
                    alt={getUserDisplayName(activity.user)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {getUserInitials(activity.user)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-slate-900">
                    {getUserDisplayName(activity.user)}
                  </span>
                  <i className={`${getActivityIcon(activity.action)} text-sm`}></i>
                </div>
                
                <p className="text-sm text-slate-600 mb-2">
                  {formatActivityText(activity)}
                </p>
                
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span>
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{activity.entityType?.replace('_', ' ')}</span>
                </div>
              </div>
              
              {/* Action Indicator */}
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}