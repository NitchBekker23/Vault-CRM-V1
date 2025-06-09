import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import SalesEntryModal from "@/components/sales-entry-modal";
import BulkSalesImportModal from "@/components/bulk-sales-import-modal";
import { format } from "date-fns";

interface Sale {
  id: number;
  clientId: number;
  saleDate: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
  saleItems: Array<{
    id: number;
    salePrice: string;
    inventoryItem: {
      name: string;
      brand: string;
      serialNumber: string;
    };
  }>;
}

export default function Sales() {
  const [search, setSearch] = useState("");
  const [showSalesEntryModal, setShowSalesEntryModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: salesData, isLoading: salesLoading } = useQuery<{
    sales: Sale[];
    total: number;
  }>({
    queryKey: ["/api/sales", { search: search.trim() || undefined }],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Sales Management" />
      <div className="p-6 space-y-6">
        {/* Sales Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Sales Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {salesData?.sales.filter(sale => 
                  format(new Date(sale.saleDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Revenue Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                R{salesData?.sales
                  .filter(sale => 
                    format(new Date(sale.saleDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  )
                  .reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0)
                  .toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Sales This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {salesData?.sales.filter(sale => {
                  const saleMonth = format(new Date(sale.saleDate), 'yyyy-MM');
                  const currentMonth = format(new Date(), 'yyyy-MM');
                  return saleMonth === currentMonth;
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Sales History</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <Input
                    type="text"
                    placeholder="Search sales..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => setShowBulkImportModal(true)}>
                  <i className="fas fa-upload mr-2"></i>
                  Bulk Import
                </Button>
                <Button onClick={() => setShowSalesEntryModal(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Record Sale
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            {salesLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/6" />
                    </div>
                  ))}
                </div>
              </div>
            ) : salesData?.sales && salesData.sales.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.sales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-slate-50">
                        <TableCell className="text-slate-900">
                          {format(new Date(sale.saleDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900">
                              {sale.client.firstName} {sale.client.lastName}
                            </div>
                            <div className="text-sm text-slate-500">
                              {sale.client.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {sale.saleItems.map((item, index) => (
                              <div key={item.id} className="text-sm">
                                <div className="font-medium text-slate-900">
                                  {item.inventoryItem.name}
                                </div>
                                <div className="text-slate-500">
                                  {item.inventoryItem.brand} - {item.inventoryItem.serialNumber}
                                  <span className="ml-2 text-green-600">
                                    R{parseFloat(item.salePrice).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            R{parseFloat(sale.totalAmount).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs">
                          {sale.notes ? (
                            <div className="truncate" title={sale.notes}>
                              {sale.notes}
                            </div>
                          ) : (
                            <span className="text-slate-400">No notes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-receipt text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No sales recorded</h3>
                <p className="text-slate-500 mb-4">Start by recording your first sale or importing sales data.</p>
                <div className="flex justify-center space-x-3">
                  <Button variant="outline" onClick={() => setShowBulkImportModal(true)}>
                    <i className="fas fa-upload mr-2"></i>
                    Bulk Import
                  </Button>
                  <Button onClick={() => setShowSalesEntryModal(true)}>
                    <i className="fas fa-plus mr-2"></i>
                    Record First Sale
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SalesEntryModal 
        isOpen={showSalesEntryModal} 
        onClose={() => setShowSalesEntryModal(false)} 
      />

      <BulkSalesImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
      />
    </>
  );
}