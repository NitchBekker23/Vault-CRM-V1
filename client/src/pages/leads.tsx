
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, MapPin, Calendar, DollarSign } from "lucide-react";
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
  leadStatus: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  estimatedValue?: number;
  notes?: string;
  createdAt: string;
  lastContactDate?: string;
  nextFollowUp?: string;
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // TODO: Replace with actual API call
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", searchTerm, statusFilter],
    queryFn: async () => {
      // Placeholder data - replace with actual API call
      const mockLeads: Lead[] = [
        {
          id: 1,
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          phone: "+27 82 123 4567",
          company: "Tech Solutions Ltd",
          position: "CEO",
          location: "Cape Town",
          leadSource: "Website",
          leadStatus: "new",
          estimatedValue: 150000,
          notes: "Interested in luxury watches",
          createdAt: "2025-01-20T10:00:00Z",
          lastContactDate: "2025-01-20T10:00:00Z",
          nextFollowUp: "2025-01-22T09:00:00Z"
        },
        {
          id: 2,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.j@corporategroup.com",
          phone: "+27 83 987 6543",
          company: "Corporate Group",
          position: "Marketing Director",
          location: "Johannesburg",
          leadSource: "Referral",
          leadStatus: "qualified",
          estimatedValue: 75000,
          notes: "Looking for gifts for executive team",
          createdAt: "2025-01-18T14:30:00Z",
          lastContactDate: "2025-01-19T11:00:00Z",
          nextFollowUp: "2025-01-21T14:00:00Z"
        }
      ];
      return mockLeads;
    }
  });

  const getStatusColor = (status: Lead['leadStatus']) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-green-100 text-green-800",
      proposal: "bg-purple-100 text-purple-800",
      negotiation: "bg-orange-100 text-orange-800",
      won: "bg-emerald-100 text-emerald-800",
      lost: "bg-red-100 text-red-800"
    };
    return colors[status];
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
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
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
            <Card key={lead.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
                  <Badge className={getStatusColor(lead.leadStatus)}>
                    {lead.leadStatus.charAt(0).toUpperCase() + lead.leadStatus.slice(1)}
                  </Badge>
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
