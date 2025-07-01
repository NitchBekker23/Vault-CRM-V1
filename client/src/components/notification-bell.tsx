import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, X, AlertCircle, Info, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  priority: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  readAt?: string;
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'high':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'normal':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'low':
      return <Clock className="h-4 w-4 text-gray-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'inventory':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'wishlist':
      return <Clock className="h-4 w-4 text-purple-500" />;
    case 'sale':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'system':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'approval':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch unread notification count
  const { data: countData } = useQuery({
    queryKey: ['/api/notifications/count?unreadOnly=true'],
    queryFn: async () => {
      const response = await fetch("/api/notifications/count?unreadOnly=true");
      if (!response.ok) throw new Error("Failed to fetch notification count");
      const data = await response.json();
      return data.count;
    },
    refetchInterval: 5 * 60 * 1000, // Reduced to 5 minutes instead of 30 seconds
    staleTime: 4 * 60 * 1000, // 4 minutes stale time
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    retry: 1, // Reduce retry attempts
  });

  // Fetch notifications when dropdown is opened
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count?unreadOnly=true'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count?unreadOnly=true'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count?unreadOnly=true'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const unreadCount = (countData as any)?.count || 0;
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          {hasUnread && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[600px] p-0"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-8 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : !notifications || (notifications as any[]).length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                You'll see updates about your inventory here
              </p>
            </div>
          ) : (
            <div className="p-0">
              {(notifications as any[]).map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`border-b last:border-b-0 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getPriorityIcon(notification.priority)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                          >
                            <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                        {notification.actionLabel && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {notification.actionLabel} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="absolute top-4 right-4">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}