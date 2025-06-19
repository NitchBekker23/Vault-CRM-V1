import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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

interface BulkSalesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SalesImportResult {
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

export default function BulkSalesImportModal({ isOpen, onClose }: BulkSalesImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<SalesImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<SalesImportResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch("/api/sales/bulk-import", {
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
    onSuccess: (result: SalesImportResult) => {
      setImportResult(result);
      setUploadProgress(100);
      
      if (result.success) {
        toast({
          title: "Sales Import Successful",
          description: `${result.imported} sales recorded successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      } else {
        toast({
          title: "Sales Import Completed with Errors",
          description: `${result.imported} sales recorded, ${result.errors.length} errors found`,
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
        description: error.message || "Failed to import sales data",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const downloadTemplate = () => {
    const headers = [
      "itemSerialNumber",
      "saleDate",
      "sellingPrice",
      "retailPrice",
      "transactionType",
      "clientId",
      "customerCode",
      "salesPerson",
      "store",
      "notes"
    ];
    
    const sampleData = [
      "SN123456789",
      "2025-06-19",
      "25000.00",
      "30000.00",
      "sale",
      "1",
      "CUST001",
      "AP",
      "001",
      "Premium Breitling watch sale at Melrose"
    ];
    
    const csvContent = [
      headers.join(","),
      sampleData.join(","),
      "# Additional rows for more sales...",
      "# itemSerialNumber: Serial number of sold item (must exist in inventory)",
      "# saleDate: Date of sale (YYYY-MM-DD format)",
      "# sellingPrice: Final sale price in ZAR",
      "# retailPrice: Original retail price in ZAR (optional)",
      "# transactionType: sale, credit, exchange, warranty",
      "# clientId: Existing client ID number (optional - if blank, uses customerCode)",
      "# customerCode: Customer identifier (CUST001, CUST002, etc.)",
      "# salesPerson: Employee ID (AP, BW, LW, etc.)",
      "# store: Store code (001=Melrose, 002=Sandton, 003=Menlyn, 006=V&A, 099=HQ)",
      "# notes: Optional sale notes"
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-import-template.csv";
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
          <DialogTitle>Bulk Import Sales</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import daily sales data and automatically update inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">Download Sales Template</h3>
                  <p className="text-sm text-slate-500">
                    Get the CSV template for importing daily sales with customer linking
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Upload Sales CSV File</h3>
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
                      {uploadMutation.isPending ? "Importing..." : "Import Sales"}
                    </Button>
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing sales...</span>
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
                    <h3 className="font-medium text-slate-900">Sales Import Results</h3>
                    <Badge variant={importResult.success ? "default" : "destructive"}>
                      {importResult.success ? "Success" : "Completed with Errors"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {importResult.imported}
                      </div>
                      <div className="text-sm text-green-700">Sales Recorded</div>
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
              <h3 className="font-medium text-slate-900 mb-3">Sales Import Instructions</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Download the template to see required fields and format</li>
                <li>• Required fields: clientEmail, serialNumber, salePrice, saleDate</li>
                <li>• Customer email must exist in your client database</li>
                <li>• Serial number must exist in your inventory (in_stock status)</li>
                <li>• Sale price should be in ZAR (numbers only, no currency symbol)</li>
                <li>• Date format: YYYY-MM-DD (e.g., 2024-06-09)</li>
                <li>• Items will automatically be marked as "sold" after import</li>
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