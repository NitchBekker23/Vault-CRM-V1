import { useAuth } from "@/hooks/useAuth";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notification-bell";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      // Redirect to login page after successful logout
      window.location.href = "/login";
    },
    onError: (error) => {
      console.error("Logout failed:", error);
      // Even if logout fails on server, redirect to login
      window.location.href = "/login";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "User";
  };

  return (
    <header className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 ${
      screenSize === 'mobile' ? 'px-4 py-3' : 'px-6 py-4'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className={`font-bold text-slate-900 dark:text-white ${
            screenSize === 'mobile' ? 'text-lg truncate pr-4' : 'text-2xl'
          }`}>
            {title}
          </h2>
          {screenSize === 'desktop' && (
            <p className="text-slate-600 dark:text-slate-300">
              Welcome back, <span>{getDisplayName()}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <NotificationBell />

          {/* User Profile Dropdown for Mobile/Tablet */}
          {screenSize !== 'desktop' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  {(user as any)?.profileImageUrl ? (
                    <img 
                      src={(user as any).profileImageUrl} 
                      alt="User avatar" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{getDisplayName()}</p>
                  <p className="text-xs text-slate-500 capitalize">{(user as any)?.role || "User"}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Desktop Layout */
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                {(user as any)?.profileImageUrl ? (
                  <img 
                    src={(user as any).profileImageUrl} 
                    alt="User avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">{getDisplayName()}</p>
                  <p className="text-slate-500 dark:text-slate-400 capitalize">{(user as any)?.role || "User"}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
