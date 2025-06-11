import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-gem text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">StockTracker Pro</h1>
              <p className="text-slate-600">Luxury Inventory Management System</p>
            </div>
          </div>
          <p className="text-xl text-slate-700 max-w-2xl mx-auto">
            Comprehensive inventory management for watches and leather goods with multi-user access, 
            demand tracking, and administrative capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-boxes text-primary"></i>
                <span>Inventory Management</span>
              </CardTitle>
              <CardDescription>
                Track watches and leather goods by serial number, brand, SKU, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline">Serial Number Tracking</Badge>
              <Badge variant="outline">Image Management</Badge>
              <Badge variant="outline">Stock Status</Badge>
              <Badge variant="outline">Purchase History</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-heart text-primary"></i>
                <span>Demand Tracking</span>
              </CardTitle>
              <CardDescription>
                Monitor wishlist requests and track customer demand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline">Wishlist Management</Badge>
              <Badge variant="outline">Lead Generation</Badge>
              <Badge variant="outline">Demand Analytics</Badge>
              <Badge variant="outline">Client Profiles</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-users text-primary"></i>
                <span>Multi-User Access</span>
              </CardTitle>
              <CardDescription>
                Role-based permissions for administrators and regular users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline">User Roles</Badge>
              <Badge variant="outline">Access Control</Badge>
              <Badge variant="outline">Activity Logging</Badge>
              <Badge variant="outline">Secure Authentication</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-upload text-primary"></i>
                <span>Bulk Operations</span>
              </CardTitle>
              <CardDescription>
                Daily stock updates and template-based bulk uploads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline">CSV Import</Badge>
              <Badge variant="outline">Template Downloads</Badge>
              <Badge variant="outline">Batch Updates</Badge>
              <Badge variant="outline">Data Validation</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => window.location.href = "/api/login"}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3 text-lg"
              onClick={() => window.location.href = "/request-account"}
            >
              <i className="fas fa-user-plus mr-2"></i>
              Request Access
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            New to the system? Request access to get started
          </p>
        </div>
      </div>
    </div>
  );
}
