import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Plus, FileText, TrendingUp, Users, DollarSign, Package, Download, Trash2, Edit, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SalesTransaction {
  id: number;
  clientId: number;
  inventoryItemId: number;
  transactionType: 'sale' | 'credit' | 'exchange' | 'warranty';
  saleDate: string;
  retailPrice: string | null;
  sellingPrice: string;
  profitMargin: string | null;
  source: string;
  notes: string | null;
  clientName?: string;
  itemName?: string;
  itemSerialNumber?: string;
}

interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  topClients: Array<{
    client: { id: number; fullName: string; email: string };
    totalSpent: number;
    transactionCount: number;
  }>;
  recentTransactions: SalesTransaction[];
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<SalesTransaction | null>(null);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await apiRequest("DELETE", `/api/sales-transactions/${transactionId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowDeleteConfirm(false);
      setTransactionToDelete(null);
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTransaction = (transaction: SalesTransaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteTransactionMutation.mutate(transactionToDelete.id);
    }
  };

  // Sales analytics query with real-time updates
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/sales-analytics", dateRangeFilter],
    queryFn: () => apiRequest(`/api/sales-analytics?dateRange=${dateRangeFilter}`),
    staleTime: 30 * 1000, // 30 seconds fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Sales transactions query with real-time updates
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/sales-transactions", page, searchQuery, transactionTypeFilter, dateRangeFilter],
    queryFn: () => apiRequest(`/api/sales-transactions?page=${page}&limit=20&search=${searchQuery}&transactionType=${transactionTypeFilter}&dateRange=${dateRangeFilter}`),
    staleTime: 30 * 1000, // 30 seconds fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/sales-transactions/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Import Complete",
        description: `Successfully imported ${data.successful} transactions. ${data.duplicates.length} duplicates found, ${data.errors.length} errors.`,
      });
      // Force immediate refresh of all related data with refetch
      queryClient.invalidateQueries({ queryKey: ["/api/sales-transactions"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-analytics"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"], refetchType: "all" });
      setShowImportDialog(false);
      setCsvFile(null);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (csvFile) {
      csvImportMutation.mutate(csvFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `itemSerialNumber,saleDate,sellingPrice,retailPrice,transactionType,clientId,customerCode,salesPerson,store,notes
SN123456789,2025-06-19,25000.00,30000.00,sale,1,CUST001,AP,001,Premium Breitling watch sale at Melrose
SN987654321,2025-06-19,18000.00,22000.00,sale,2,CUST002,BW,002,Luxury leather goods purchase at Sandton
SN555666777,2025-06-19,5000.00,6000.00,credit,3,CUST003,LW,006,Return credit processed at V&A Waterfront`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sales_import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "R0.00";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'credit':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'exchange':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'warranty':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Import Sales CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Sales Transactions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  CSV should include: itemSerialNumber, saleDate, sellingPrice, retailPrice, transactionType, clientId, customerCode, salesPerson, store, notes
                </p>
              </div>
              {csvFile && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Selected: {csvFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(csvFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={!csvFile || csvImportMutation.isPending}
                  className="flex-1"
                >
                  {csvImportMutation.isPending ? "Importing..." : "Import"}
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">{analytics?.totalSales || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics?.totalProfit || 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Top Clients</p>
                      <p className="text-2xl font-bold">{analytics?.topClients?.length || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topClients?.slice(0, 5).map((item: any, index: number) => (
                    <div key={item.client.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.client.fullName}</p>
                          <p className="text-xs text-muted-foreground">{item.transactionCount} transactions</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(item.totalSpent)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentTransactions?.slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                          {transaction.transactionType}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{transaction.itemName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.saleDate)}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(transaction.sellingPrice)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-12 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-8 bg-muted rounded w-20 animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : transactionsData?.transactions?.length ? (
                    transactionsData.transactions.map((transaction: SalesTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                            {transaction.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.clientName || 'Unknown'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.itemName}</p>
                            <p className="text-xs text-muted-foreground">{transaction.itemSerialNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(transaction.saleDate)}</TableCell>
                        <TableCell>{formatCurrency(transaction.sellingPrice)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.source.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                            onClick={() => handleDeleteTransaction(transaction)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No transactions found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sales Analytics</h2>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Sales</span>
                  <span className="text-lg font-bold">{analytics?.totalSales || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Revenue</span>
                  <span className="text-lg font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Profit</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(analytics?.totalProfit || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Sale</span>
                  <span className="text-lg font-bold">
                    {analytics?.totalSales && analytics?.totalRevenue 
                      ? formatCurrency(analytics.totalRevenue / analytics.totalSales) 
                      : "$0.00"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topClients?.map((item: any, index: number) => (
                    <div key={item.client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.client.fullName}</p>
                          <p className="text-sm text-muted-foreground">{item.client.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.totalSpent)}</p>
                        <p className="text-sm text-muted-foreground">{item.transactionCount} transactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium">Are you sure you want to delete this transaction?</p>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            {transactionToDelete && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p><span className="font-medium">Client:</span> {transactionToDelete.clientName}</p>
                <p><span className="font-medium">Item:</span> {transactionToDelete.itemName}</p>
                <p><span className="font-medium">Amount:</span> {formatCurrency(transactionToDelete.sellingPrice)}</p>
                <p><span className="font-medium">Date:</span> {formatDate(transactionToDelete.saleDate)}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteTransaction} 
              disabled={deleteTransactionMutation.isPending}
            >
              {deleteTransactionMutation.isPending ? "Deleting..." : "Delete Transaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}