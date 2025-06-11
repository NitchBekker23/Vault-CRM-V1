import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";

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
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200 lg:hidden"
        >
          <Menu className="h-6 w-6 text-slate-600" />
        </button>

        {/* Mobile sidebar overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <i className="fas fa-gem text-white text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">StockTracker</h1>
                    <p className="text-xs text-slate-500">Luxury Inventory</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-6 w-6 text-slate-600" />
                </button>
              </div>
              
              <nav className="px-4 py-4 h-full overflow-y-auto">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link 
                        href={item.href} 
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                          location === item.href
                            ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <i className={`${item.icon} w-5`}></i>
                        <span className={location === item.href ? "font-medium" : ""}>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                  
                  {user?.role === "admin" && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Admin Tools
                      </p>
                      <ul className="space-y-1">
                        {adminNavigation.map((item) => (
                          <li key={item.name}>
                            <Link 
                              href={item.href} 
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                                location === item.href
                                  ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                                  : "text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              <i className={`${item.icon} w-5`}></i>
                              <span className={location === item.href ? "font-medium" : ""}>{item.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ul>
              </nav>
            </aside>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full hidden lg:block">
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
        
        {(user?.role === "admin" || user?.role === "owner") && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Admin Tools
            </p>
            <ul className="space-y-1">
              <li>
                <Link href="/admin/users" className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                  location === "/admin/users"
                    ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                    : "text-slate-600 hover:bg-slate-100"
                )}>
                  <i className="fas fa-user-shield w-5"></i>
                  <span className={location === "/admin/users" ? "font-medium" : ""}>User Management</span>
                </Link>
              </li>
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
