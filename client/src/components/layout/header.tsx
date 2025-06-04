import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-slate-600">
              {subtitle}
              {user && (
                <span>, <span className="font-medium">{user.firstName || user.email}</span></span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="User avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email
                }
              </p>
              <p className="text-slate-500 capitalize">{user?.role}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = "/api/logout"}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
