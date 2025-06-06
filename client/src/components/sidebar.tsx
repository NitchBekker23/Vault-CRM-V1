import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: "fas fa-chart-line" },
  { name: "Inventory", href: "/inventory", icon: "fas fa-boxes" },
  { name: "Wishlist", href: "/wishlist", icon: "fas fa-heart" },
  { name: "Clients", href: "/clients", icon: "fas fa-users" },
  { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar" },
  { name: "Settings", href: "/settings", icon: "fas fa-cog" },
];

const adminNavigation = [
  { name: "Bulk Upload", href: "/bulk-upload", icon: "fas fa-upload" },
  { name: "User Management", href: "/user-management", icon: "fas fa-user-shield" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-gem text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">StockTracker</h1>
            <p className="text-xs text-slate-500">Luxury Inventory</p>
          </div>
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className={cn(
                "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                location === item.href
                  ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                  : "text-slate-600 hover:bg-slate-100"
              )}>
                <i className={`${item.icon} w-5`}></i>
                <span className={location === item.href ? "font-medium" : ""}>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        {user?.role === "admin" && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Admin Tools
            </p>
            <ul className="space-y-1">
              {adminNavigation.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                    location === item.href
                      ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                      : "text-slate-600 hover:bg-slate-100"
                  )}>
                    <i className={`${item.icon} w-5`}></i>
                    <span className={location === item.href ? "font-medium" : ""}>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
