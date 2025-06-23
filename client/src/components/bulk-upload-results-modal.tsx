import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";

interface BulkUploadResult {
  successCount: number;
  skippedCount: number;
  errorCount: number;
  totalProcessed: number;
  summary?: {
    successful: string[];
    skipped: string[];
    errors: string[];
  };
}

interface BulkUploadResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BulkUploadResult | null;
}

export default function BulkUploadResultsModal({ isOpen, onClose, result }: BulkUploadResultsModalProps) {
  if (!result) return null;

  const downloadFailedClients = () => {
    if (!result.summary?.errors) return;
    
    const headers = ['Row', 'Issue', 'Details'];
    const csvContent = [
      headers.join(','),
      ...result.summary.errors.map(error => {
        // Parse error message to extract row and issue details
        const parts = error.split(': ');
        const row = parts[0] || 'Unknown';
        const issue = parts.slice(1).join(': ') || 'Unknown error';
        return `"${row}","Failed","${issue.replace(/"/g, '""')}"`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `failed_clients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSkippedClients = () => {
    if (!result.summary?.skipped) return;
    
    const headers = ['Row', 'Status', 'Details'];
    const csvContent = [
      headers.join(','),
      ...result.summary.skipped.map(skipped => {
        const parts = skipped.split(': ');
        const row = parts[0] || 'Unknown';
        const details = parts.slice(1).join(': ') || 'Duplicate found';
        return `"${row}","Skipped","${details.replace(/"/g, '""')}"`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `skipped_clients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Results</DialogTitle>
          <DialogDescription>
            Detailed results for your client bulk upload operation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Successful</p>
                  <p className="text-2xl font-bold text-green-900">{result.successCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-900">{result.skippedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{result.errorCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Processed</p>
                  <p className="text-2xl font-bold text-blue-900">{result.totalProcessed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="successful" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="successful" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Successful ({result.successCount})
              </TabsTrigger>
              <TabsTrigger value="skipped" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Skipped ({result.skippedCount})
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed ({result.errorCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="successful" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Successfully Imported Clients</h3>
                <Badge variant="secondary">{result.successCount} clients</Badge>
              </div>
              <ScrollArea className="h-60 w-full border rounded-md p-4">
                <div className="space-y-1">
                  {result.summary?.successful?.map((success, index) => (
                    <div key={index} className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✓ {success}
                    </div>
                  )) || <p className="text-gray-500">No detailed information available</p>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="skipped" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Skipped Clients (Duplicates)</h3>
                <div className="flex gap-2">
                  <Badge variant="secondary">{result.skippedCount} clients</Badge>
                  {result.skippedCount > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={downloadSkippedClients}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download List
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-60 w-full border rounded-md p-4">
                <div className="space-y-1">
                  {result.summary?.skipped?.map((skipped, index) => (
                    <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                      ⚠ {skipped}
                    </div>
                  )) || <p className="text-gray-500">No skipped clients</p>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="failed" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Failed Clients (Need Re-upload)</h3>
                <div className="flex gap-2">
                  <Badge variant="destructive">{result.errorCount} clients</Badge>
                  {result.errorCount > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={downloadFailedClients}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download List
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-60 w-full border rounded-md p-4">
                <div className="space-y-1">
                  {result.summary?.errors?.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      ✗ {error}
                    </div>
                  )) || <p className="text-gray-500">No failed clients</p>}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}