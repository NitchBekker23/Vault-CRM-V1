import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  Gem, 
  BarChart3, 
  Package, 
  Heart, 
  Users, 
  LineChart, 
  Settings,
  Upload,
  UserCog
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Analytics", href: "/analytics", icon: LineChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNavigation = [
  { name: "Bulk Upload", href: "/admin/bulk-upload", icon: Upload },
  { name: "User Management", href: "/admin/users", icon: UserCog },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Gem className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">StockTracker</h1>
            <p className="text-xs text-slate-500">Luxury Inventory</p>
          </div>
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 border-r-2 border-primary text-primary font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Admin Section */}
        {user?.role === 'admin' && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Admin Tools
            </p>
            <ul className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 border-r-2 border-primary text-primary font-medium"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
