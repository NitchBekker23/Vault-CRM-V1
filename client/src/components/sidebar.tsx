import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: "fas fa-chart-line" },
  { name: "Inventory", href: "/inventory", icon: "fas fa-boxes" },
  { name: "Wishlist", href: "/wishlist", icon: "fas fa-heart" },
  { name: "Clients", href: "/clients", icon: "fas fa-users" },
  { name: "Sales", href: "/sales", icon: "fas fa-dollar-sign" },
  { name: "Sales Team", href: "/sales-management", icon: "fas fa-user-tie" },
  { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar" },
  { name: "Settings", href: "/settings", icon: "fas fa-cog" },
];

const adminNavigation = [
  { name: "Bulk Upload", href: "/bulk-upload", icon: "fas fa-upload" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  // Check if user has admin privileges
  const isAdmin: boolean = !!(user && (
    (user as any)?.role === "admin" || 
    (user as any)?.role === "owner" ||
    (user as any)?.email === "nitchbekker@gmail.com" // Fallback for Christopher Bekker
  ));



  if (screenSize === 'mobile' || screenSize === 'tablet') {
    return (
      <>
        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 lg:hidden transition-all duration-200 hover:shadow-xl active:scale-95"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Mobile sidebar overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300" 
              onClick={() => setIsOpen(false)}
              onTouchStart={() => setIsOpen(false)}
            />
            <aside className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-out ${
              screenSize === 'mobile' ? 'w-80 max-w-[85vw]' : 'w-96'
            }`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <i className="fas fa-gem text-white text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">The Vault</h1>
                    <p className="text-xs text-slate-500">CRM</p>
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
                </ul>
                
                {isAdmin ? (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Admin Tools
                    </p>
                    <ul className="space-y-1">
                      <li>
                        <Link 
                          href="/admin/users" 
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                            location === "/admin/users"
                              ? "text-slate-700 bg-primary/10 border-r-2 border-primary"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <i className="fas fa-user-shield w-5"></i>
                          <span className={location === "/admin/users" ? "font-medium" : ""}>User Management</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                ) : null}
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
            <h1 className="text-lg font-semibold text-slate-900">The Vault</h1>
            <p className="text-xs text-slate-500">CRM</p>
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
        
        {isAdmin ? (
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
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
