import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, X, MoreHorizontal, Edit, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, Phone, Mail, MapPin, Wrench, Info, FileText, Upload, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Repair {
  id: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  itemBrand: string;
  itemModel: string;
  itemSerial: string | null;
  issueDescription: string;
  repairStatus: string;
  outcome: string | null;
  quotedPrice: string | null;
  finalPrice: string | null;
  store: string | null;
  notes: string | null;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
  quoteDate: string | null;
  acceptedDate: string | null;
  completedDate: string | null;
  receivedDate: string | null;
  estimatedCompletionDate: string | null;
  repairDocuments: string[];
  repairImages: string[];
  assignedTo: string | null;
  createdBy: string;
}

interface RepairActivity {
  id: number;
  repairId: number;
  userId: string;
  action: string;
  details: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

const repairFormSchema = z.object({
  customerCode: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, {
    message: "Invalid email format"
  }),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  itemBrand: z.string().min(1, "Item brand is required"),
  itemModel: z.string().min(1, "Item model is required"),
  itemSerial: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required"),
  store: z.string().optional(),
  notes: z.string().optional(),
  quotedPrice: z.string().optional(),
  finalPrice: z.string().optional(),
  receivedDate: z.string().optional(),
  estimatedCompletionDate: z.string().optional(),
  repairDocuments: z.array(z.string()).optional().default([]),
  repairImages: z.array(z.string()).optional().default([]),
});

type RepairFormData = z.infer<typeof repairFormSchema>;

const statusUpdates = {
  new_repair: { label: "New Repair", color: "bg-blue-500", icon: Wrench },
  quote_sent: { label: "Quote Sent", color: "bg-yellow-500", icon: Clock },
  quote_accepted: { label: "Quote Accepted", color: "bg-green-500", icon: CheckCircle },
  quote_declined: { label: "Quote Declined", color: "bg-red-500", icon: XCircle },
  repair_received_back: { label: "Repair Received Back", color: "bg-purple-500", icon: Calendar },
  outcome: { label: "Outcome", color: "bg-gray-500", icon: Info },
};

const outcomes = {
  completed: { label: "Completed", color: "bg-green-600", icon: CheckCircle },
  customer_declined: { label: "Customer Declined", color: "bg-red-500", icon: XCircle },
  unrepairable: { label: "Unrepairable", color: "bg-orange-500", icon: AlertTriangle },
  customer_no_response: { label: "No Response", color: "bg-gray-500", icon: Clock },
};

export default function Repairs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState("all");
  const [showNewRepairModal, setShowNewRepairModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ repair: Repair; newStatus: string; outcome?: string } | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState<Repair | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RepairFormData>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      customerCode: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      itemBrand: "",
      itemModel: "",
      itemSerial: "",
      issueDescription: "",
      store: "",
      notes: "",
      quotedPrice: "",
      finalPrice: "",
      receivedDate: "",
      estimatedCompletionDate: "",
      repairDocuments: [],
      repairImages: [],
    },
  });

  // Build query params
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (storeFilter !== 'all') params.append('store', storeFilter);
    if (outcomeFilter !== 'all') params.append('outcome', outcomeFilter);
    if (openFilter !== 'all') params.append('isOpen', openFilter === 'open' ? 'true' : 'false');
    return params.toString() ? `?${params.toString()}` : '';
  };

  const { data: repairsData, isLoading } = useQuery<{ repairs: Repair[]; total: number }>({
    queryKey: [`/api/repairs${buildQuery()}`],
    retry: false,
  });

  const { data: repairActivities } = useQuery<RepairActivity[]>({
    queryKey: [`/api/repairs/${selectedRepair?.id}/activity`],
    enabled: !!selectedRepair,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: RepairFormData) => {
      console.log("Creating repair with data:", data);
      return apiRequest("POST", `/api/repairs`, data);
    },
    onSuccess: async (result: any) => {
      console.log("Repair creation successful:", result);
      
      // Upload pending files if any
      const allPendingFiles = [...pendingDocuments, ...pendingImages];
      if (allPendingFiles.length > 0) {
        try {
          console.log(`Uploading ${allPendingFiles.length} files for repair ${result.id}`);
          await fileUploadMutation.mutateAsync({
            id: result.id,
            files: allPendingFiles
          });
          // Clear pending files after successful upload
          setPendingDocuments([]);
          setPendingImages([]);
        } catch (uploadError) {
          console.error("File upload error after repair creation:", uploadError);
          toast({
            title: "Warning",
            description: "Repair created but file upload failed. You can upload files later.",
            variant: "destructive",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return key ? key.toString().startsWith("/api/repairs") : false;
      }});
      setShowNewRepairModal(false);
      form.reset();
      // Clear pending files after successful creation
      setPendingDocuments([]);
      setPendingImages([]);
      toast({
        title: "Success",
        description: "Repair created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create repair",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RepairFormData> }) =>
      apiRequest("PUT", `/api/repairs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      setEditingRepair(null);
      toast({
        title: "Success",
        description: "Repair updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update repair",
        variant: "destructive",
      });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status, outcome, notes }: { id: number; status: string; outcome?: string; notes?: string }) =>
      apiRequest("PATCH", `/api/repairs/${id}/status`, { status, outcome, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      setStatusUpdate(null);
      toast({
        title: "Success",
        description: "Repair status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update repair status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/repairs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      toast({
        title: "Success",
        description: "Repair deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete repair",
        variant: "destructive",
      });
    },
  });

  const fileUploadMutation = useMutation({
    mutationFn: async ({ id, files }: { id: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/repairs/${id}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include session cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      setShowDocumentModal(null);
      toast({
        title: "Success",
        description: `Successfully uploaded ${data.uploadedFiles?.length || 0} file(s)`,
      });
    },
    onError: (error: any) => {
      console.error('File upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const handleViewDocument = async (repairId: number, filename: string, type: 'document' | 'image') => {
    try {
      const url = `/api/repairs/${repairId}/documents/${encodeURIComponent(filename)}?action=view`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({ 
        title: "Failed to view document", 
        description: "Could not open the document",
        variant: "destructive" 
      });
    }
  };

  const handleDownloadDocument = async (repairId: number, filename: string, type: 'document' | 'image') => {
    try {
      const url = `/api/repairs/${repairId}/documents/${encodeURIComponent(filename)}?action=download`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Document downloaded successfully" });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ 
        title: "Failed to download document", 
        description: "Could not download the document",
        variant: "destructive" 
      });
    }
  };

  const handleSubmit = (data: RepairFormData) => {
    console.log("=== FRONTEND SUBMIT DEBUG ===");
    console.log("Form data submitted:", data);
    console.log("Editing repair:", editingRepair);
    console.log("Form validation errors:", form.formState.errors);
    
    if (editingRepair) {
      console.log("Updating existing repair");
      updateMutation.mutate({ id: editingRepair.id, data });
    } else {
      console.log("Creating new repair");
      createMutation.mutate(data);
    }
  };

  const handleStatusUpdate = (repair: Repair, newStatus: string, outcome?: string) => {
    setStatusUpdate({ repair, newStatus, outcome });
  };

  const confirmStatusUpdate = () => {
    if (!statusUpdate) return;
    
    statusUpdateMutation.mutate({
      id: statusUpdate.repair.id,
      status: statusUpdate.newStatus,
      outcome: statusUpdate.outcome,
    });
  };

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair);
    form.reset({
      customerCode: repair.customerCode || "",
      customerName: repair.customerName,
      customerEmail: repair.customerEmail || "",
      customerPhone: repair.customerPhone || "",
      customerAddress: repair.customerAddress || "",
      itemBrand: repair.itemBrand,
      itemModel: repair.itemModel,
      itemSerial: repair.itemSerial || "",
      issueDescription: repair.issueDescription,
      store: repair.store || "",
      notes: repair.notes || "",
      quotedPrice: repair.quotedPrice || "",
      finalPrice: repair.finalPrice || "",
      receivedDate: repair.receivedDate ? repair.receivedDate.split('T')[0] : "",
      estimatedCompletionDate: repair.estimatedCompletionDate ? repair.estimatedCompletionDate.split('T')[0] : "",
      repairDocuments: repair.repairDocuments || [],
      repairImages: repair.repairImages || [],
    });
    setShowNewRepairModal(true);
  };

  const handleNewRepair = () => {
    setEditingRepair(null);
    form.reset();
    setShowNewRepairModal(true);
  };

  const getStatusBadge = (repair: Repair) => {
    if (repair.outcome) {
      const outcome = outcomes[repair.outcome as keyof typeof outcomes];
      if (outcome) {
        const Icon = outcome.icon;
        return (
          <Badge className={`${outcome.color} text-white`}>
            <Icon className="w-3 h-3 mr-1" />
            {outcome.label}
          </Badge>
        );
      }
    }

    const status = statusUpdates[repair.repairStatus as keyof typeof statusUpdates];
    if (status) {
      const Icon = status.icon;
      return (
        <Badge className={`${status.color} text-white`}>
          <Icon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      );
    }

    return <Badge variant="secondary">{repair.repairStatus}</Badge>;
  };

  const openRepairs = repairsData?.repairs.filter(r => r.isOpen) || [];
  const closedRepairs = repairsData?.repairs.filter(r => !r.isOpen) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repair Management</h1>
          <p className="text-muted-foreground">Track and manage item repairs from request to completion</p>
        </div>
        <Button onClick={handleNewRepair} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Repair
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search repairs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="099">HQ</SelectItem>
                <SelectItem value="001">Melrose</SelectItem>
                <SelectItem value="003">Menlyn</SelectItem>
                <SelectItem value="006">Breitling V&A</SelectItem>
                <SelectItem value="002">Breitling Sandton</SelectItem>
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="customer_declined">Customer Declined</SelectItem>
                <SelectItem value="unrepairable">Unrepairable</SelectItem>
                <SelectItem value="customer_no_response">No Response</SelectItem>
              </SelectContent>
            </Select>

            <Select value={openFilter} onValueChange={setOpenFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || storeFilter !== "all" || outcomeFilter !== "all" || openFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStoreFilter("all");
                  setOutcomeFilter("all");
                  setOpenFilter("all");
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repair Tabs */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">Open Repairs ({openRepairs.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed Repairs ({closedRepairs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {openRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Open Repairs</h3>
                <p className="text-muted-foreground mb-4">No active repair requests found.</p>
                <Button onClick={handleNewRepair}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Repair
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {openRepairs.map((repair) => (
                <Card key={repair.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">
                            {repair.itemBrand} {repair.itemModel}
                            {repair.itemSerial && <span className="text-muted-foreground ml-2">#{repair.itemSerial}</span>}
                          </h3>
                          {getStatusBadge(repair)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{repair.customerName}</span>
                          </div>
                          {repair.customerEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{repair.customerEmail}</span>
                            </div>
                          )}
                          {repair.customerPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{repair.customerPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDistanceToNow(new Date(repair.createdAt), { addSuffix: true })}</span>
                          </div>
                          {repair.quotedPrice && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Quote:</span>
                              <span className="font-medium">R{parseFloat(repair.quotedPrice).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {repair.issueDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRepair(repair)}
                        >
                          View Details
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(repair)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => setShowDocumentModal(repair)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Manage Documents
                            </DropdownMenuItem>
                            
                            {repair.repairStatus === 'new_repair' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'quote_sent')}>
                                <Clock className="w-4 h-4 mr-2" />
                                Mark Quote Sent
                              </DropdownMenuItem>
                            )}
                            
                            {repair.repairStatus === 'quote_sent' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'quote_accepted')}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Quote Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'quote_declined')}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Mark Quote Declined
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {repair.repairStatus === 'quote_accepted' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'repair_received_back')}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Mark Repair Received
                              </DropdownMenuItem>
                            )}
                            
                            {repair.repairStatus === 'repair_received_back' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'outcome', 'completed')}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'outcome', 'customer_declined')}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Customer Declined
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(repair, 'outcome', 'unrepairable')}>
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Unrepairable
                                </DropdownMenuItem>
                              </>
                            )}
                            

                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {closedRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Closed Repairs</h3>
                <p className="text-muted-foreground">No completed repairs found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {closedRepairs.map((repair) => (
                <Card key={repair.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">
                            {repair.itemBrand} {repair.itemModel}
                            {repair.itemSerial && <span className="text-muted-foreground ml-2">#{repair.itemSerial}</span>}
                          </h3>
                          {getStatusBadge(repair)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{repair.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDistanceToNow(new Date(repair.createdAt), { addSuffix: true })}</span>
                          </div>
                          {repair.finalPrice && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Final:</span>
                              <span className="font-medium">R{parseFloat(repair.finalPrice).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {repair.issueDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRepair(repair)}
                        >
                          View Details
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShowDocumentModal(repair)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Documents
                            </DropdownMenuItem>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Repair
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Closed Repair</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this completed repair record? This action cannot be undone and will remove all associated documents.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(repair.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New/Edit Repair Modal */}
      <Dialog open={showNewRepairModal} onOpenChange={setShowNewRepairModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRepair ? "Edit Repair" : "New Repair Request"}</DialogTitle>
            <DialogDescription>
              {editingRepair ? "Update repair details" : "Create a new repair request"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
              console.log("=== FORM VALIDATION ERRORS ===");
              console.log("Validation errors:", errors);
            })} className="space-y-3">
              {/* Customer Information Section */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="customerCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 101554" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Link to existing client for complete history tracking
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
                      <FormControl>
                        <Input placeholder="customer@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="store"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="002">Breitling Sandton</SelectItem>
                          <SelectItem value="006">Breitling V&A</SelectItem>
                          <SelectItem value="099">HQ</SelectItem>
                          <SelectItem value="001">Melrose</SelectItem>
                          <SelectItem value="003">Menlyn</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Customer address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Item Information Section */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Item Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="itemBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Brand *</FormLabel>
                      <FormControl>
                        <Input placeholder="Rolex, Tudor, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Model *</FormLabel>
                      <FormControl>
                        <Input placeholder="Submariner, GMT, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemSerial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Serial number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>

              <FormField
                control={form.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the issue with the item that needs repair..." 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              {/* Pricing Information Section */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Pricing & Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="quotedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quoted Price (R)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="finalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Final Price (R)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="receivedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Received</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimatedCompletionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Completion Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="repairDocuments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documents</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            multiple
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              field.onChange(files.map(f => f.name));
                              // Store the actual files for later upload (replace, don't append)
                              if (files.length > 0) {
                                setPendingDocuments(files);
                              }
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Upload repair documents (PDF, DOC, DOCX, TXT)
                        </p>
                        {pendingDocuments.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <strong>Selected:</strong> {pendingDocuments.map(f => f.name).join(', ')}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repairImages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Images</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              field.onChange(files.map(f => f.name));
                              // Store the actual files for later upload (replace, don't append)
                              if (files.length > 0) {
                                setPendingImages(files);
                              }
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Upload repair images (JPG, PNG, etc.)
                        </p>
                        {pendingImages.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <strong>Selected:</strong> {pendingImages.map(f => f.name).join(', ')}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Internal notes for tracking..." 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowNewRepairModal(false);
                    // Clear pending files when cancelling
                    setPendingDocuments([]);
                    setPendingImages([]);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  {editingRepair ? "Update Repair" : "Create Repair"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Repair Details Modal */}
      {selectedRepair && (
        <Dialog open={!!selectedRepair} onOpenChange={() => setSelectedRepair(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                {selectedRepair.itemBrand} {selectedRepair.itemModel} Repair
              </DialogTitle>
              <DialogDescription>
                Repair request #{selectedRepair.id} • Created {formatDistanceToNow(new Date(selectedRepair.createdAt), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedRepair.customerName}</span>
                    </div>
                    {selectedRepair.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedRepair.customerEmail}</span>
                      </div>
                    )}
                    {selectedRepair.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedRepair.customerPhone}</span>
                      </div>
                    )}
                    {selectedRepair.customerAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{selectedRepair.customerAddress}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Item Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-muted-foreground">Brand: </span>
                      <span className="font-medium">{selectedRepair.itemBrand}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model: </span>
                      <span className="font-medium">{selectedRepair.itemModel}</span>
                    </div>
                    {selectedRepair.itemSerial && (
                      <div>
                        <span className="text-muted-foreground">Serial: </span>
                        <span className="font-medium">{selectedRepair.itemSerial}</span>
                      </div>
                    )}
                    {selectedRepair.store && (
                      <div>
                        <span className="text-muted-foreground">Store: </span>
                        <span className="font-medium">{selectedRepair.store}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(selectedRepair.quotedPrice || selectedRepair.finalPrice) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRepair.quotedPrice && (
                        <div>
                          <span className="text-muted-foreground">Quoted Price: </span>
                          <span className="font-medium">R{parseFloat(selectedRepair.quotedPrice).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedRepair.finalPrice && (
                        <div>
                          <span className="text-muted-foreground">Final Price: </span>
                          <span className="font-medium">R{parseFloat(selectedRepair.finalPrice).toLocaleString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Issue Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedRepair.issueDescription}</p>
                  </CardContent>
                </Card>

                {selectedRepair.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Internal Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedRepair.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {repairActivities && repairActivities.length > 0 ? (
                      <div className="space-y-3">
                        {repairActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="font-medium">{activity.details}</p>
                              <p className="text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No activity recorded yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Update Confirmation */}
      {statusUpdate && (
        <AlertDialog open={!!statusUpdate} onOpenChange={() => setStatusUpdate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Repair Status</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to update this repair to{" "}
                <strong>
                  {statusUpdate.outcome 
                    ? outcomes[statusUpdate.outcome as keyof typeof outcomes]?.label 
                    : statusUpdates[statusUpdate.newStatus as keyof typeof statusUpdates]?.label
                  }
                </strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStatusUpdate}>
                Update Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Document Management Modal */}
      {showDocumentModal && (
        <Dialog open={!!showDocumentModal} onOpenChange={() => setShowDocumentModal(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Documents - {showDocumentModal.customerName}</DialogTitle>
              <DialogDescription>
                Upload and manage documents and images for this repair
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Current Documents */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Documents</h4>
                    {showDocumentModal.repairDocuments && showDocumentModal.repairDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {showDocumentModal.repairDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2" />
                              <span className="text-sm">{doc}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDocument(showDocumentModal.id, doc, 'document')}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadDocument(showDocumentModal.id, doc, 'document')}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No documents uploaded</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Images</h4>
                    {showDocumentModal.repairImages && showDocumentModal.repairImages.length > 0 ? (
                      <div className="space-y-2">
                        {showDocumentModal.repairImages.map((img, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              <span className="text-sm">{img}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDocument(showDocumentModal.id, img, 'image')}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadDocument(showDocumentModal.id, img, 'image')}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No images uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload New Documents */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Upload New Files</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Documents</label>
                    <Input 
                      type="file" 
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      className="mt-1"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          fileUploadMutation.mutate({
                            id: showDocumentModal.id,
                            files: files
                          });
                          // Clear the input after upload
                          e.target.value = '';
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload repair documents (PDF, DOC, DOCX, TXT)
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Images</label>
                    <Input 
                      type="file" 
                      multiple
                      accept="image/*"
                      className="mt-1"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          fileUploadMutation.mutate({
                            id: showDocumentModal.id,
                            files: files
                          });
                          // Clear the input after upload
                          e.target.value = '';
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload repair images (JPG, PNG, etc.)
                    </p>
                  </div>
                </div>
              </div>

              {/* Repair Stage Documents */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Stage-Specific Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Quote Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        <Upload className="w-3 h-3 mr-1" />
                        Upload Quote
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Work Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        <Upload className="w-3 h-3 mr-1" />
                        Upload Work Order
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Completion Certificate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        <Upload className="w-3 h-3 mr-1" />
                        Upload Certificate
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDocumentModal(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}