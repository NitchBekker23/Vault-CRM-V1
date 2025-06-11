import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

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
    <header className={`bg-white border-b border-slate-200 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className={`font-bold text-slate-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{title}</h2>
          {!isMobile && (
            <p className="text-slate-600">
              Welcome back, <span>{getDisplayName()}</span>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button className="relative p-2 text-slate-400 hover:text-slate-600">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>
          <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="User avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-slate-600 text-sm"></i>
              </div>
            )}
            {!isMobile && (
              <div className="text-sm">
                <p className="font-medium text-slate-900">{getDisplayName()}</p>
                <p className="text-slate-500 capitalize">{user?.role || "User"}</p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {!isMobile && "Logout"}
          </Button>
        </div>
      </div>
    </header>
  );
}
