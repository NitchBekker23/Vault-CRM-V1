import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { User, Eye, Edit, ShoppingBag, Star, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import ClientProfileModal from "@/components/client-profile-modal";
import { Client } from "@shared/schema";

// Form schema for adding new clients
const addClientSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
});

type AddClientForm = z.infer<typeof addClientSchema>;

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Form for adding new clients
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

  const { data: clientsData, isLoading: isLoadingClients, error } = useQuery<{
    clients: Client[];
    total: number;
  }>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (clientData: AddClientForm) => {
      return apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(clientData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Client Added",
        description: "New client has been successfully added to the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAddModal(false);
      addClientForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Client",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
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
  }, [error, toast]);

  const handleViewProfile = (clientId: number) => {
    setSelectedClientId(clientId);
    setShowProfileModal(true);
  };

  const handleAddClient = (data: AddClientForm) => {
    addClientMutation.mutate(data);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "R0.00";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toFixed(2)}`;
  };

  const getVipStatusColor = (status: string) => {
    switch (status) {
      case 'premium':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'vip':
        return 'bg-gradient-to-r from-purple-500 to-purple-700 text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Filter clients based on search query
  const filteredClients = clientsData?.clients?.filter(client =>
    client.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phoneNumber?.includes(searchQuery)
  ) || [];

  if (isLoading || !isAuthenticated || isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Client Management" />
      <div className="p-6">
        <Card>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Client Database ({filteredClients.length})
              </h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
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
                                <Input placeholder="Enter client's full name" {...field} />
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
                                <Input type="email" placeholder="client@example.com" {...field} />
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
                                <Input placeholder="+27 11 123 4567" {...field} />
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
                                <Input placeholder="Johannesburg, Cape Town, etc." {...field} />
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
                                <Input placeholder="Internal notes about this client" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2 pt-4">
                          <Button 
                            type="submit" 
                            disabled={addClientMutation.isPending}
                            className="flex-1"
                          >
                            {addClientMutation.isPending ? "Adding..." : "Add Client"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchases</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
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
                          <div className="space-y-1">
                            <p className="text-sm">{client.email || "No email"}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.phoneNumber || client.phone || "No phone"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getVipStatusColor(client.vipStatus || 'regular')}>
                            <Star className="h-3 w-3 mr-1" />
                            {(client.vipStatus || 'regular').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{client.totalPurchases || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatCurrency(client.totalSpend || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewProfile(client.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewProfile(client.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewProfile(client.id)}
                            >
                              <ShoppingBag className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "No clients match your search" : "No clients found"}
                </h3>
                <p className="text-muted-foreground mb-4">
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

        {/* Client Profile Modal */}
        <ClientProfileModal
          clientId={selectedClientId}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedClientId(null);
          }}
        />
      </div>
    </>
  );
}
