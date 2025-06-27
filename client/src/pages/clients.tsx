import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Eye, Edit, ShoppingBag, Star, Plus, Search, Download, Upload, Trash2, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import ClientProfileModal from "@/components/client-profile-modal";
import BulkUploadResultsModal from "@/components/bulk-upload-results-modal";
import { Client } from "@shared/schema";

// Form validation schema
const addClientSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
});

type AddClientForm = z.infer<typeof addClientSchema>;

export default function Clients() {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms delay
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  
  // Filter states
  const [vipStatusFilter, setVipStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [purchaseRangeFilter, setPurchaseRangeFilter] = useState<string>("all");
  
  // Sorting states
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Form setup
  const addClientForm = useForm<AddClientForm>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      location: "",
      preferences: "",
      notes: "",
    },
  });

  // Fetch clients data with real-time updates and cache busting
  const { data: clientsData, isLoading: isLoadingClients, error, refetch } = useQuery({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated && !isLoading,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 1000, // Aggressive 3-second refresh
    refetchIntervalInBackground: false
  });

  // Force immediate refresh when component mounts
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const timer = setTimeout(() => refetch(), 100); // Small delay to ensure auth is ready
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, refetch]);

  // Handle sorting functionality
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredClients = (clientsData as any)?.clients?.filter((client: any) => {
    // Search filter - using debounced query for performance
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      const matchesSearch = (
        client.fullName?.toLowerCase().includes(query) ||
        client.firstName?.toLowerCase().includes(query) ||
        client.lastName?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phoneNumber?.toLowerCase().includes(query) ||
        client.customerNumber?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // VIP Status filter
    if (vipStatusFilter !== "all") {
      if (client.vipStatus !== vipStatusFilter) return false;
    }

    // Location filter
    if (locationFilter !== "all") {
      if (client.location !== locationFilter) return false;
    }

    // Purchase Range filter
    if (purchaseRangeFilter !== "all") {
      const purchaseCount = client.purchaseCount || 0;
      switch (purchaseRangeFilter) {
        case "0":
          if (purchaseCount !== 0) return false;
          break;
        case "1-5":
          if (purchaseCount < 1 || purchaseCount > 5) return false;
          break;
        case "6-10":
          if (purchaseCount < 6 || purchaseCount > 10) return false;
          break;
        case "10+":
          if (purchaseCount <= 10) return false;
          break;
      }
    }

    return true;
  })?.sort((a: any, b: any) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle numeric values
    if (sortField === "purchaseCount" || sortField === "totalSpend") {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }
    
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) || [];

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (data: AddClientForm) => {
      const response = await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAddModal(false);
      addClientForm.reset();
      toast({
        title: "Success",
        description: "Client added successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowDeleteConfirm(false);
      setClientToDelete(null);
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = (data: AddClientForm) => {
    addClientMutation.mutate(data);
  };

  const handleDeleteClient = (client: any) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  };

  const downloadClientTemplate = () => {
    const csvContent = `fullName,email,phoneNumber,location,preferences,notes
John Doe,john@example.com,+27123456789,Johannesburg,Watches and leather goods,VIP client
Jane Smith,jane@example.com,+27987654321,Cape Town,Luxury timepieces,Regular customer`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/clients/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setUploadResults(result);
      setShowResultsModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${result.successful} clients`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const getVipBadgeColor = (status: string) => {
    switch (status) {
      case "premium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "vip": return "bg-purple-100 text-purple-800 border-purple-300";
      default: return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  if (isLoading || isLoadingClients) {
    return (
      <>
        <Header title="Client Management" />
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading clients...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Client Management" />
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Error Loading Clients
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {(error as Error).message}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Client Management" />
      <div className="p-6">
        <Card>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Client Database ({filteredClients.length})
              </h3>
            </div>
            
            {/* Filter Row */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Filters:</span>
              </div>
              
              <Select value={vipStatusFilter} onValueChange={setVipStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="VIP Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Johannesburg">Johannesburg</SelectItem>
                  <SelectItem value="Cape Town">Cape Town</SelectItem>
                  <SelectItem value="Durban">Durban</SelectItem>
                  <SelectItem value="Pretoria">Pretoria</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={purchaseRangeFilter} onValueChange={setPurchaseRangeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Purchases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchases</SelectItem>
                  <SelectItem value="0">No Purchases</SelectItem>
                  <SelectItem value="1-5">1-5 Purchases</SelectItem>
                  <SelectItem value="6-10">6-10 Purchases</SelectItem>
                  <SelectItem value="10+">10+ Purchases</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setVipStatusFilter("all");
                  setLocationFilter("all");
                  setPurchaseRangeFilter("all");
                  setSortField("");
                  setSearchQuery("");
                }}
              >
                Clear All
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by name, email, phone, or customer number..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadClientTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button variant="outline" disabled={isUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Bulk Upload"}
                  </Button>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                    </DialogHeader>
                    <Form {...addClientForm}>
                      <form onSubmit={addClientForm.handleSubmit(handleAddClient)} className="space-y-4">
                        <FormField
                          control={addClientForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addClientForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addClientForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addClientForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addClientForm.control}
                          name="preferences"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferences</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addClientForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={addClientMutation.isPending}>
                            {addClientMutation.isPending ? "Adding..." : "Add Client"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            {filteredClients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Customer #</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => handleSort("purchaseCount")}
                      >
                        <div className="flex items-center gap-1">
                          Purchases
                          {sortField === "purchaseCount" && (
                            sortDirection === "asc" ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => handleSort("totalSpend")}
                      >
                        <div className="flex items-center gap-1">
                          Total Spend
                          {sortField === "totalSpend" && (
                            sortDirection === "asc" ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {client.fullName?.charAt(0) || client.firstName?.charAt(0) || "C"}
                            </div>
                            <div>
                              <p className="font-medium">
                                {client.fullName || `${client.firstName} ${client.lastName}`}
                              </p>
                              <p className="text-sm text-muted-foreground">{client.location || "No location"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {client.customerNumber ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                                {client.customerNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No number</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{client.email || "No email"}</p>
                            <p className="text-muted-foreground">{client.phoneNumber || "No phone"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getVipBadgeColor(client.vipStatus || "regular")}>
                            {(client.vipStatus || "regular").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{client.purchaseCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            R{(client.totalSpend || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setShowProfileModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              onClick={() => handleDeleteClient(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {searchQuery ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
                  {searchQuery 
                    ? "Try adjusting your search terms or add a new client."
                    : "Start by adding your first client to the database."
                  }
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {searchQuery ? "Add Client" : "Add First Client"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to delete {clientToDelete?.fullName || `${clientToDelete?.firstName} ${clientToDelete?.lastName}`}?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteClientMutation.isPending}>
                {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Client Profile Modal */}
        <ClientProfileModal
          clientId={selectedClientId}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedClientId(null);
          }}
        />

        {/* Bulk Upload Results Modal */}
        <BulkUploadResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setUploadResults(null);
          }}
          result={uploadResults}
        />
      </div>
    </>
  );
}