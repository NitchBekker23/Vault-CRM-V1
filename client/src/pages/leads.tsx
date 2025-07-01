
import { useState } from "react";
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
  estimatedValue?: number;
  notes?: string;
  isOpen: boolean;
  createdAt: string;
  lastContactDate?: string;
  nextFollowUp?: string;
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Fetch leads from API
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads", searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/leads?${params}`);
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.leadStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
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
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="appointment">Appointment</option>
              <option value="outcome">Outcome</option>
            </select>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow">
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
                
                {lead.estimatedValue && (
                  <div className="flex items-center text-sm font-medium text-green-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {formatCurrency(lead.estimatedValue)}
                  </div>
                )}
                
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Lead
            </Button>
          </div>
        )}
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
