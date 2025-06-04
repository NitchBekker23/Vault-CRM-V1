import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BulkUpload() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <>
        <Header title="Bulk Upload" />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <i className="fas fa-shield-alt text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Access Denied</h3>
                <p className="text-slate-500">You need administrator privileges to access this feature.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Bulk Upload" />
      <div className="p-6">
        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-download text-primary"></i>
                <span>Download Templates</span>
              </CardTitle>
              <CardDescription>Download CSV templates for bulk inventory uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  <i className="fas fa-file-csv text-3xl text-slate-400 mb-3"></i>
                  <h3 className="font-medium text-slate-900 mb-2">Inventory Template</h3>
                  <p className="text-sm text-slate-600 mb-4">Template for uploading inventory items</p>
                  <Button variant="outline">
                    <i className="fas fa-download mr-2"></i>
                    Download CSV
                  </Button>
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  <i className="fas fa-file-csv text-3xl text-slate-400 mb-3"></i>
                  <h3 className="font-medium text-slate-900 mb-2">Update Template</h3>
                  <p className="text-sm text-slate-600 mb-4">Template for updating existing items</p>
                  <Button variant="outline">
                    <i className="fas fa-download mr-2"></i>
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-upload text-primary"></i>
                <span>Upload Inventory</span>
              </CardTitle>
              <CardDescription>Upload CSV files to add or update inventory items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <i className="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Drop your CSV file here</h3>
                <p className="text-slate-600 mb-4">or click to browse and select a file</p>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Badge variant="outline">CSV Format</Badge>
                  <Badge variant="outline">Max 10MB</Badge>
                  <Badge variant="outline">UTF-8 Encoding</Badge>
                </div>
                <input type="file" className="hidden" accept=".csv" />
                <Button>
                  <i className="fas fa-file-upload mr-2"></i>
                  Select File
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>Recent bulk upload activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <i className="fas fa-history text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No upload history</h3>
                <p className="text-slate-500">Upload history will appear here after your first bulk upload.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
