
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Phone, Mail, MapPin, Calendar, DollarSign, ArrowRight, CheckCircle, XCircle, Clock, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  position?: string;
  location?: string;
  leadSource: string;
  leadStatus: 'new' | 'contacted' | 'appointment' | 'outcome';
  outcome?: 'won' | 'lost' | 'wishlist';
  skuReferences?: string; // JSON array of SKU model numbers
  notes?: string;
  isOpen: boolean;
  createdAt: string;
  lastContactDate?: string;
  nextFollowUp?: string;
}

// Form schema for creating/editing leads
const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
  position: z.string().optional(),
  location: z.string().optional(),
  leadSource: z.string().min(1, "Lead source is required"),
  skuReferences: z.string().optional(),
  notes: z.string().optional(),
  lastContactDate: z.string().optional(),
  nextFollowUp: z.string().optional(),
});

// Store locations data
const STORE_LOCATIONS = [
  { value: "HQ", label: "HQ - Head Office", code: "099" },
  { value: "Melrose", label: "Melrose - Melrose Arch", code: "001" },
  { value: "Menlyn", label: "Menlyn - Menlyn Park", code: "003" },
  { value: "Breitling V&A", label: "Breitling V&A - V&A Waterfront", code: "006" },
  { value: "Breitling Sandton", label: "Breitling Sandton - Sandton City", code: "002" },
];

// Utility function to parse and format SKU references
const formatSkuReferences = (skuString?: string) => {
  if (!skuString) return [];
  return skuString
    .split(/[,\n]/)
    .map(sku => sku.trim())
    .filter(sku => sku.length > 0);
};

const displaySkuReferences = (skuString?: string) => {
  const skus = formatSkuReferences(skuString);
  if (skus.length === 0) return "No specific items";
  if (skus.length <= 3) return skus.join(", ");
  return `${skus.slice(0, 3).join(", ")} +${skus.length - 3} more`;
};

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Advanced filter states
  const [openClosedFilter, setOpenClosedFilter] = useState<string>("all"); // all, open, closed
  const [dateFilter, setDateFilter] = useState<string>("all"); // all, appointment, created, nextContact, lastContact
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  console.log("[Leads] Component loading, searchTerm:", searchTerm, "statusFilter:", statusFilter);

  // Fetch leads from API
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads"], // Simplified query key since we're doing client-side filtering
    queryFn: async () => {
      const response = await fetch(`/api/leads?page=1&limit=100`);
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }
      return response.json();
    }
  });

  const leads = leadsData?.leads || [];

  // Status progression mutation
  const progressStatusMutation = useMutation({
    mutationFn: async ({ leadId, newStatus, outcome, notes }: { 
      leadId: number; 
      newStatus: string; 
      outcome?: string; 
      notes?: string; 
    }) => {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, outcome, notes }),
      });
      if (!response.ok) throw new Error("Failed to update lead status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Success", description: "Lead status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead status", variant: "destructive" });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: z.infer<typeof leadFormSchema>) => {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowAddModal(false);
      toast({ title: "Success", description: "Lead created successfully" });
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof leadFormSchema>> }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditingLead(null);
      toast({ title: "Success", description: "Lead updated successfully" });
    },
  });

  // Toggle open/closed mutation
  const toggleLeadMutation = useMutation({
    mutationFn: async ({ leadId, isOpen }: { leadId: number; isOpen: boolean }) => {
      const response = await fetch(`/api/leads/${leadId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen }),
      });
      if (!response.ok) throw new Error("Failed to toggle lead status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Success", description: "Lead status toggled successfully" });
    },
  });

  const getStatusColor = (status: Lead['leadStatus'], outcome?: Lead['outcome']) => {
    if (status === 'outcome' && outcome) {
      const outcomeColors = {
        won: "bg-emerald-100 text-emerald-800",
        lost: "bg-red-100 text-red-800",
        wishlist: "bg-purple-100 text-purple-800"
      };
      return outcomeColors[outcome];
    }
    
    const colors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      appointment: "bg-orange-100 text-orange-800",
      outcome: "bg-green-100 text-green-800"
    };
    return colors[status];
  };

  const getNextStatus = (currentStatus: Lead['leadStatus']) => {
    const statusFlow = {
      new: 'contacted',
      contacted: 'appointment',
      appointment: 'outcome',
      outcome: 'outcome' // Already at final stage
    };
    return statusFlow[currentStatus];
  };

  const getStatusIcon = (status: Lead['leadStatus'], outcome?: Lead['outcome']) => {
    if (status === 'outcome' && outcome) {
      const icons = {
        won: <CheckCircle className="h-4 w-4" />,
        lost: <XCircle className="h-4 w-4" />,
        wishlist: <Target className="h-4 w-4" />
      };
      return icons[outcome];
    }
    
    const icons = {
      new: <Clock className="h-4 w-4" />,
      contacted: <Phone className="h-4 w-4" />,
      appointment: <Calendar className="h-4 w-4" />,
      outcome: <Target className="h-4 w-4" />
    };
    return icons[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const filteredLeads = leads.filter((lead: Lead) => {
    // Enhanced search functionality
    let matchesSearch = true;
    if (searchTerm.trim()) {
      const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
      const searchableText = [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.company || '',
        lead.position || '',
        lead.phone,
        lead.leadSource,
        lead.notes || '',
        lead.skuReferences || ''
      ].join(' ').toLowerCase();
      
      // All search words must be found in the searchable text
      matchesSearch = searchWords.every(word => searchableText.includes(word));
    }
    
    const matchesStatus = statusFilter === "all" || lead.leadStatus === statusFilter;
    
    // Open/Closed filter
    const matchesOpenClosed = openClosedFilter === "all" || 
      (openClosedFilter === "open" && lead.isOpen) ||
      (openClosedFilter === "closed" && !lead.isOpen);
    
    // Store location filter
    const matchesStore = storeFilter === "all" || lead.location === storeFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== "all" && (dateFrom || dateTo)) {
      let targetDate: string | undefined;
      
      switch (dateFilter) {
        case "created":
          targetDate = lead.createdAt;
          break;
        case "lastContact":
          targetDate = lead.lastContactDate;
          break;
        case "nextContact":
          targetDate = lead.nextFollowUp;
          break;
        case "appointment":
          // For appointment date, we might need to add this field to the Lead interface
          targetDate = lead.nextFollowUp; // Using nextFollowUp as appointment date for now
          break;
      }
      
      if (targetDate) {
        const date = new Date(targetDate);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        
        if (fromDate && date < fromDate) matchesDate = false;
        if (toDate && date > toDate) matchesDate = false;
      } else {
        matchesDate = false; // No date available for the selected filter
      }
    }
    
    return matchesSearch && matchesStatus && matchesOpenClosed && matchesStore && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="Lead Management" />
      
      <div className="p-6 space-y-6">
        {/* Comprehensive Filter System */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6 space-y-4">
          {/* Top Row - Search and Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, email, company, phone, SKU... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Open/Closed Filter */}
            <div>
              <Label htmlFor="openClosedFilter" className="text-sm font-medium">Ticket Status</Label>
              <Select value={openClosedFilter} onValueChange={setOpenClosedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open Tickets</SelectItem>
                  <SelectItem value="closed">Closed Tickets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline Status Filter */}
            <div>
              <Label htmlFor="statusFilter" className="text-sm font-medium">Pipeline Stage</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Store Filter */}
            <div>
              <Label htmlFor="storeFilter" className="text-sm font-medium">Store Location</Label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {STORE_LOCATIONS.map((store) => (
                    <SelectItem key={store.value} value={store.value}>
                      {store.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter Type */}
            <div>
              <Label htmlFor="dateFilter" className="text-sm font-medium">Date Filter</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="No Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Date Filter</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="lastContact">Last Contact</SelectItem>
                  <SelectItem value="nextContact">Next Contact</SelectItem>
                  <SelectItem value="appointment">Appointment Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setOpenClosedFilter("all");
                  setStoreFilter("all");
                  setDateFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Date Range Row - Only show when date filter is active */}
          {dateFilter !== "all" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredLeads.length} of {leads.length} leads
            {(searchTerm || statusFilter !== "all" || openClosedFilter !== "all" || storeFilter !== "all" || dateFilter !== "all") && (
              <span className="ml-2 text-primary">• Filters active</span>
            )}
          </span>
          {filteredLeads.length > 0 && (
            <span>
              {filteredLeads.filter((lead: Lead) => lead.isOpen).length} open, {filteredLeads.filter((lead: Lead) => !lead.isOpen).length} closed
            </span>
          )}
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setEditingLead(lead)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {lead.firstName} {lead.lastName}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {lead.position && lead.company ? `${lead.position} at ${lead.company}` : lead.company}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getStatusColor(lead.leadStatus, lead.outcome)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(lead.leadStatus, lead.outcome)}
                        {lead.outcome || lead.leadStatus.charAt(0).toUpperCase() + lead.leadStatus.slice(1)}
                      </span>
                    </Badge>
                    <Badge variant={lead.isOpen ? "default" : "secondary"} className="text-xs">
                      {lead.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {lead.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {lead.phone}
                  </div>
                  {lead.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {lead.location}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center text-sm font-medium text-blue-600">
                  <Target className="h-4 w-4 mr-2" />
                  SKUs: {displaySkuReferences(lead.skuReferences)}
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>Source: {lead.leadSource}</div>
                  <div>Created: {new Date(lead.createdAt).toLocaleDateString()}</div>
                  {lead.nextFollowUp && (
                    <div className="flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      Follow up: {new Date(lead.nextFollowUp).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                {lead.notes && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {lead.notes.length > 100 ? `${lead.notes.substring(0, 100)}...` : lead.notes}
                  </p>
                )}

                {/* Workflow Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  {lead.leadStatus !== 'outcome' && lead.isOpen && (
                    <WorkflowProgressButton 
                      lead={lead} 
                      onProgress={progressStatusMutation.mutate}
                      isLoading={progressStatusMutation.isPending}
                    />
                  )}
                  
                  {lead.leadStatus === 'outcome' && !lead.outcome && lead.isOpen && (
                    <OutcomeSelectionDialog 
                      lead={lead} 
                      onOutcome={progressStatusMutation.mutate}
                      isLoading={progressStatusMutation.isPending}
                    />
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLeadMutation.mutate({ 
                      leadId: lead.id, 
                      isOpen: !lead.isOpen 
                    })}
                    disabled={toggleLeadMutation.isPending}
                  >
                    {lead.isOpen ? "Close" : "Reopen"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first lead"
              }
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Lead
            </Button>
          </div>
        )}

        {/* Add Lead Modal */}
        <AddLeadModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => createLeadMutation.mutate(data)}
        />

        {/* Edit Lead Modal */}
        <EditLeadModal 
          lead={editingLead} 
          onClose={() => setEditingLead(null)}
          onSubmit={(id, data) => updateLeadMutation.mutate({ id, data })}
        />
      </div>
    </div>
  );
}

// Helper function to get next status in workflow
function getNextStatus(currentStatus: Lead['leadStatus']): Lead['leadStatus'] {
  const statusFlow: Record<Lead['leadStatus'], Lead['leadStatus']> = {
    'new': 'contacted',
    'contacted': 'appointment', 
    'appointment': 'outcome',
    'outcome': 'outcome' // Stay at outcome
  };
  
  return statusFlow[currentStatus];
}

// Workflow progression button component
function WorkflowProgressButton({ 
  lead, 
  onProgress, 
  isLoading 
}: { 
  lead: Lead; 
  onProgress: (data: any) => void; 
  isLoading: boolean; 
}) {
  const nextStatus = getNextStatus(lead.leadStatus);
  
  return (
    <Button
      size="sm"
      onClick={() => onProgress({ 
        leadId: lead.id, 
        newStatus: nextStatus,
        notes: `Progressed from ${lead.leadStatus} to ${nextStatus}`
      })}
      disabled={isLoading}
      className="flex-1"
    >
      <ArrowRight className="h-4 w-4 mr-1" />
      Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
    </Button>
  );
}

// Outcome selection dialog component
function OutcomeSelectionDialog({ 
  lead, 
  onOutcome, 
  isLoading 
}: { 
  lead: Lead; 
  onOutcome: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!selectedOutcome) return;
    
    onOutcome({ 
      leadId: lead.id, 
      newStatus: 'outcome',
      outcome: selectedOutcome,
      notes: notes || `Lead outcome set to: ${selectedOutcome}`
    });
    
    setOpen(false);
    setSelectedOutcome("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex-1">
          <Target className="h-4 w-4 mr-1" />
          Set Outcome
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Lead Outcome</DialogTitle>
          <DialogDescription>
            Choose the final outcome for {lead.firstName} {lead.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Outcome</label>
            <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="won">Won - Sale Closed</SelectItem>
                <SelectItem value="lost">Lost - No Sale</SelectItem>
                <SelectItem value="wishlist">Wishlist - Future Interest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this outcome..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedOutcome || isLoading}
          >
            Set Outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Lead Modal Component
function AddLeadModal({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
}) {
  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      location: "",
      leadSource: "",
      skuReferences: "",
      notes: "",
      lastContactDate: "",
      nextFollowUp: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof leadFormSchema>) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Create a new lead and add them to your pipeline
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Location</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store location" />
                        </SelectTrigger>
                        <SelectContent>
                          {STORE_LOCATIONS.map((store) => (
                            <SelectItem key={store.value} value={store.value}>
                              {store.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leadSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Cold Call">Cold Call</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Trade Show">Trade Show</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="skuReferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU References</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., RX-001, TU-005, BR-123 (comma separated)" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastContactDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Contact Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextFollowUp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Follow Up</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes about this lead..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Create Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Lead Modal Component
function EditLeadModal({ 
  lead, 
  onClose, 
  onSubmit 
}: { 
  lead: Lead | null; 
  onClose: () => void; 
  onSubmit: (id: number, data: any) => void; 
}) {
  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      location: "",
      leadSource: "",
      skuReferences: "",
      notes: "",
      lastContactDate: "",
      nextFollowUp: "",
    },
  });

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        position: lead.position || "",
        location: lead.location || "",
        leadSource: lead.leadSource || "",
        skuReferences: lead.skuReferences || "",
        notes: lead.notes || "",
        lastContactDate: lead.lastContactDate ? lead.lastContactDate.split('T')[0] : "",
        nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.split('T')[0] : "",
      });
    }
  }, [lead, form]);

  const handleSubmit = (data: z.infer<typeof leadFormSchema>) => {
    if (lead) {
      onSubmit(lead.id, data);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update information for {lead.firstName} {lead.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Location</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store location" />
                        </SelectTrigger>
                        <SelectContent>
                          {STORE_LOCATIONS.map((store) => (
                            <SelectItem key={store.value} value={store.value}>
                              {store.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leadSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Cold Call">Cold Call</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Trade Show">Trade Show</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="skuReferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU References</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., RX-001, TU-005, BR-123 (comma separated)" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastContactDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Contact Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextFollowUp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Follow Up</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes about this lead..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Update Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
