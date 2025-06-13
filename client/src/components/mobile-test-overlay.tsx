import { useState } from "react";
import { useScreenSize } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Tablet, Smartphone, X } from "lucide-react";

export default function MobileTestOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const screenSize = useScreenSize();

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 touch-button"
        size="sm"
        variant="outline"
      >
        <Monitor className="h-4 w-4 mr-2" />
        Test Mobile
      </Button>
    );
  }

  const getScreenIcon = () => {
    switch (screenSize) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-green-500" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-blue-500" />;
      default:
        return <Monitor className="h-5 w-5 text-purple-500" />;
    }
  };

  const getScreenColor = () => {
    switch (screenSize) {
      case 'mobile':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'tablet':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getScreenIcon()}
            Responsive Test
          </CardTitle>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Current Screen Size</h4>
          <Badge className={getScreenColor()}>
            {screenSize.toUpperCase()} ({window.innerWidth}px)
          </Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">Breakpoints</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mobile:</span>
              <span className="text-slate-600">{'< 768px'}</span>
            </div>
            <div className="flex justify-between">
              <span>Tablet:</span>
              <span className="text-slate-600">768px - 1024px</span>
            </div>
            <div className="flex justify-between">
              <span>Desktop:</span>
              <span className="text-slate-600">{'> 1024px'}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Active Features</h4>
          <div className="space-y-1 text-xs">
            {screenSize === 'mobile' && (
              <>
                <div className="text-green-600">✓ Mobile sidebar with overlay</div>
                <div className="text-green-600">✓ Card view for inventory</div>
                <div className="text-green-600">✓ Compact header layout</div>
                <div className="text-green-600">✓ Touch-friendly buttons</div>
                <div className="text-green-600">✓ Responsive padding</div>
              </>
            )}
            {screenSize === 'tablet' && (
              <>
                <div className="text-blue-600">✓ Mobile sidebar behavior</div>
                <div className="text-blue-600">✓ Optimized grid layouts</div>
                <div className="text-blue-600">✓ Medium padding spacing</div>
                <div className="text-blue-600">✓ Tablet-sized components</div>
              </>
            )}
            {screenSize === 'desktop' && (
              <>
                <div className="text-purple-600">✓ Fixed sidebar navigation</div>
                <div className="text-purple-600">✓ Full table view</div>
                <div className="text-purple-600">✓ Desktop header layout</div>
                <div className="text-purple-600">✓ Maximum screen usage</div>
              </>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Resize your browser window to test different breakpoints
        </div>
      </CardContent>
    </Card>
  );
}