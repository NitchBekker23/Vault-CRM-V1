import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScreenSize } from "@/hooks/use-mobile";

interface ModernPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    icon?: string;
  }>;
  stats?: Array<{
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

export default function ModernPageHeader({ 
  title, 
  subtitle, 
  badge, 
  actions = [], 
  stats = [] 
}: ModernPageHeaderProps) {
  const screenSize = useScreenSize();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 truncate">{title}</h1>
              {badge && (
                <Badge variant={badge.variant || 'secondary'} className="text-sm">
                  {badge.text}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-lg text-slate-600">{subtitle}</p>
            )}
          </div>
          
          {actions.length > 0 && (
            <div className={`flex ${screenSize === 'mobile' ? 'flex-col gap-2' : 'flex-row gap-3'}`}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                  className="flex items-center gap-2"
                >
                  {action.icon && <i className={action.icon}></i>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Row */}
        {stats.length > 0 && (
          <div className={`grid ${
            screenSize === 'mobile' 
              ? 'grid-cols-2 gap-4' 
              : screenSize === 'tablet'
              ? 'grid-cols-3 gap-6'
              : 'grid-cols-4 gap-8'
          }`}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                  {stat.change && (
                    <span className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 
                      'text-slate-500'
                    }`}>
                      {stat.trend === 'up' && '↗'} 
                      {stat.trend === 'down' && '↘'}
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}