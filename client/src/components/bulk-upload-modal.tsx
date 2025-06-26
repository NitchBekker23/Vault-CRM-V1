import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  processed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: any;
  }>;
  imported: number;
}

export default function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch("/api/inventory/bulk-import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setUploadProgress(100);
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: `${result.imported} items imported successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.imported} items imported, ${result.errors.length} errors found`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import inventory data",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const downloadTemplate = () => {
    const headers = [
      "name",
      "brand", 
      "serialNumber",
      "sku",
      "category",
      "status",
      "price",
      "costPrice",
      "description",
      "dateReceived",
      "imageUrls"
    ];
    
    const sampleData = [
      "Rolex Submariner",
      "Rolex",
      "RS12345",
      "ROLEX-SUB-001",
      "watches", // watches, leather-goods, pens, other
      "in_stock", // in_stock, sold, out_of_stock
      "8500.00",
      "7200.00",
      "Classic diving watch",
      "2024-06-01", // dateReceived (YYYY-MM-DD format, leave empty for current date)
      ""
    ];
    
    const sampleData2 = [
      "Montblanc Meisterstück",
      "Montblanc", 
      "MB12345",
      "MB-MSTR-001",
      "pens",
      "in_stock",
      "750.00",
      "620.00",
      "Classic fountain pen with gold nib",
      "2024-06-03", // dateReceived
      ""
    ];

    const sampleData3 = [
      "Custom Leather Portfolio",
      "Artisan", 
      "CLP001",
      "CUSTOM-PORT-001",
      "other",
      "in_stock",
      "450.00",
      "280.00",
      "Hand-crafted leather portfolio for documents",
      "2024-06-04", // dateReceived
      ""
    ];
    
    const csvContent = [
      headers.join(","),
      sampleData.join(","),
      sampleData2.join(","),
      sampleData3.join(",")
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    
    setUploadProgress(10);
    uploadMutation.mutate(file);
  };

  const resetModal = () => {
    setFile(null);
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Inventory</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple inventory items at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">Download Template</h3>
                  <p className="text-sm text-slate-500">
                    CSV template with SKU field for automatic image reuse
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium text-slate-900 mb-3">Important Notes</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Serial Numbers:</strong> Must be unique for each item. No duplicates allowed across your entire inventory.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>SKU Image Reuse:</strong> Items with the same SKU will automatically reuse existing images from previous uploads.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Multiple SKUs:</strong> Upload multiple items with the same SKU but different serial numbers to save time on image uploads.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Upload CSV File</h3>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 mb-2">
                      {file ? file.name : "Click to select a CSV file"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                    >
                      Select File
                    </Button>
                  </div>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      size="sm"
                    >
                      {uploadMutation.isPending ? "Importing..." : "Import"}
                    </Button>
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Import Results</h3>
                    <Badge variant={importResult.success ? "default" : "destructive"}>
                      {importResult.success ? "Success" : "Completed with Errors"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {importResult.imported}
                      </div>
                      <div className="text-sm text-green-700">Items Imported</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-600">
                        {importResult.processed}
                      </div>
                      <div className="text-sm text-slate-700">Total Processed</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        Errors ({importResult.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-red-800">
                                  Row {error.row}, Field: {error.field}
                                </div>
                                <div className="text-red-600">{error.message}</div>
                                {error.value && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Value: {String(error.value)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium text-slate-900 mb-3">Import Instructions</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Download the template to see required fields and format</li>
                <li>• Required fields: name, brand, serialNumber, category, status, price</li>
                <li>• Categories: watches, leather-goods, accessories</li>
                <li>• Status: in_stock, sold, out_of_stock</li>
                <li>• Price should be in ZAR (numbers only, no currency symbol)</li>
                <li>• Multiple image URLs should be separated by commas</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}