import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Mail, Calendar, Star, ShoppingBag, Edit, Save, X, Wrench, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Client } from "@shared/schema";
import { useLocation } from "wouter";

interface ClientProfileModalProps {
  clientId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SalesTransaction {
  id: number;
  saleDate: string;
  sellingPrice: string;
  retailPrice: string | null;
  transactionType: string;
  itemName: string;
  itemSerialNumber: string;
  store: string | null;
  salesPerson: string | null;
  notes: string | null;
}

interface RepairRecord {
  id: number;
  customerCode: string | null;
  customerName: string;
  itemBrand: string;
  itemModel: string;
  itemSerial: string | null;
  issueDescription: string;
  repairStatus: string;
  outcome: string | null;
  quotedPrice: string | null;
  finalPrice: string | null;
  store: string | null;
  createdAt: string;
  completedDate: string | null;
}

export default function ClientProfileModal({ clientId, isOpen, onClose }: ClientProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Navigation function to go to specific repair
  const navigateToRepair = (repairId: number) => {
    console.log(`Navigating to repair ${repairId}`);
    onClose(); // Close the modal first
    setLocation("/repairs"); // Navigate to repairs page
    
    // Store the repair ID for highlighting after navigation
    sessionStorage.setItem('highlightRepairId', repairId.toString());
    
    // Try to find and highlight the repair with multiple attempts
    const attemptHighlight = (attempts = 0) => {
      const maxAttempts = 10;
      const repairElement = document.getElementById(`repair-${repairId}`);
      
      console.log(`Attempt ${attempts + 1}: Looking for repair-${repairId}`, repairElement ? 'Found' : 'Not found');
      
      if (repairElement) {
        // Found the element - highlight it
        repairElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        repairElement.style.border = '3px solid #3b82f6';
        repairElement.style.borderRadius = '8px';
        repairElement.style.transition = 'border 0.3s ease';
        
        console.log('Successfully highlighted repair');
        
        // Remove highlighting after 4 seconds
        setTimeout(() => {
          repairElement.style.border = '';
          repairElement.style.borderRadius = '';
          sessionStorage.removeItem('highlightRepairId');
        }, 4000);
      } else if (attempts < maxAttempts) {
        // Not found yet - try again
        setTimeout(() => attemptHighlight(attempts + 1), 300);
      } else {
        console.log('Could not find repair element after maximum attempts');
        sessionStorage.removeItem('highlightRepairId');
      }
    };
    
    // Start highlighting attempts after a short delay
    setTimeout(() => attemptHighlight(), 200);
  };

  // Fetch client details
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    queryFn: () => apiRequest(`/api/clients/${clientId}`),
    enabled: isOpen && !!clientId,
  });

  // Fetch client purchase history
  const { data: purchaseHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "purchases"],
    queryFn: () => apiRequest(`/api/clients/${clientId}/purchase-history`),
    enabled: isOpen && !!clientId,
  });

  // Fetch client repair history
  const { data: repairHistory, isLoading: repairLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "repairs"],
    queryFn: () => apiRequest(`/api/clients/${clientId}/repair-history`),
    enabled: isOpen && !!clientId,
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (updatedData: Partial<Client>) => {
      return apiRequest("PATCH", `/api/clients/${clientId}`, updatedData);
    },
    onSuccess: () => {
      toast({
        title: "Client Updated",
        description: "Client information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      setIsEditing(false);
      setEditedClient({});
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update client",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (client && isEditing) {
      setEditedClient({
        fullName: client.fullName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        location: client.location,
        preferences: client.preferences,
        notes: client.notes,
        birthday: client.birthday,
      });
    }
  }, [client, isEditing]);

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "R0.00";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  const handleSave = () => {
    updateClientMutation.mutate(editedClient);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedClient({});
  };

  if (!isOpen || !clientId) {
    return null;
  }

  if (clientLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!client) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Client Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">The requested client could not be found.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {client.fullName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={updateClientMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateClientMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="purchases">Purchase History</TabsTrigger>
            <TabsTrigger value="repairs">Repair History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        value={editedClient.fullName || ""}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium mt-1">{client.fullName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={editedClient.email || ""}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{client.email || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    {isEditing ? (
                      <Input
                        id="phoneNumber"
                        value={editedClient.phoneNumber || ""}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{client.phoneNumber || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={editedClient.location || ""}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, location: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm mt-1">{client.location || "Not specified"}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    {isEditing ? (
                      <Input
                        id="birthday"
                        type="date"
                        value={editedClient.birthday ? new Date(editedClient.birthday).toISOString().split('T')[0] : ""}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, birthday: e.target.value ? new Date(e.target.value) : null }))}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(client.birthday)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client Status & Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Status & Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">VIP Status</span>
                    <Badge className={getVipStatusColor(client.vipStatus || 'regular')}>
                      <Star className="h-3 w-3 mr-1" />
                      {client.vipStatus?.toUpperCase() || 'REGULAR'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Purchases</span>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold">{client.totalPurchases || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Spend</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(client.totalSpend || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Purchase</span>
                    <span className="text-sm">{formatDate(client.lastPurchaseDate)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Client Since</span>
                    <span className="text-sm">{formatDate(client.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preferences and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      placeholder="Client preferences, style preferences, communication preferences, etc."
                      value={editedClient.preferences || ""}
                      onChange={(e) => setEditedClient(prev => ({ ...prev, preferences: e.target.value }))}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {client.preferences || "No preferences recorded"}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      placeholder="Internal notes about this client..."
                      value={editedClient.notes || ""}
                      onChange={(e) => setEditedClient(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {client.notes || "No notes available"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Purchase History</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : purchaseHistory?.transactions && purchaseHistory.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>Sales Person</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseHistory.transactions.map((transaction: SalesTransaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.saleDate)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{transaction.itemName}</p>
                                <p className="text-xs text-muted-foreground">SN: {transaction.itemSerialNumber}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                                {transaction.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(transaction.sellingPrice)}
                            </TableCell>
                            <TableCell>{transaction.store || "Unknown"}</TableCell>
                            <TableCell>{transaction.salesPerson || "Unknown"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No purchase history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(client.totalSpend || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Lifetime Value</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {client.totalPurchases || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {client.totalPurchases && client.totalSpend 
                        ? formatCurrency(parseFloat(client.totalSpend) / client.totalPurchases)
                        : "R0.00"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Average Purchase</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Client Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">VIP Status Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      {client.vipStatus === 'premium' 
                        ? "Premium client with exceptional spending history and loyalty."
                        : client.vipStatus === 'vip'
                        ? "VIP client with strong purchase history and high value."
                        : "Regular client with potential for growth and increased engagement."
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Engagement Recommendations</h4>
                    <p className="text-sm text-muted-foreground">
                      {client.totalPurchases && client.totalPurchases > 5
                        ? "Highly engaged client. Consider exclusive previews and special offers."
                        : client.totalPurchases && client.totalPurchases > 2
                        ? "Active client. Perfect for targeted marketing and loyalty programs."
                        : "New or low-activity client. Focus on relationship building and first impressions."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repairs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Repair History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {repairLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : repairHistory?.repairs && repairHistory.repairs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Showing {repairHistory.repairs.length} repair{repairHistory.repairs.length === 1 ? '' : 's'}
                    </div>
                    
                    <div className="space-y-4">
                      {repairHistory.repairs.map((repair: RepairRecord) => (
                        <div key={repair.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">
                                {repair.itemBrand} {repair.itemModel}
                              </h4>
                              {repair.itemSerial && (
                                <p className="text-sm text-muted-foreground">
                                  Serial: {repair.itemSerial}
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <Badge 
                                variant={
                                  repair.repairStatus === 'completed' ? 'default' :
                                  repair.repairStatus === 'quote_sent' ? 'secondary' :
                                  repair.repairStatus === 'quote_accepted' ? 'secondary' :
                                  repair.repairStatus === 'received_back' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {repair.repairStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                              {repair.outcome && (
                                <div className="mt-1">
                                  <Badge 
                                    variant={
                                      repair.outcome === 'completed' ? 'default' :
                                      repair.outcome === 'customer_declined' ? 'destructive' :
                                      repair.outcome === 'unrepairable' ? 'destructive' :
                                      'outline'
                                    }
                                  >
                                    {repair.outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium">Issue:</span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {repair.issueDescription}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Created:</span>
                                <p className="text-muted-foreground">
                                  {new Date(repair.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {repair.completedDate && (
                                <div>
                                  <span className="font-medium">Completed:</span>
                                  <p className="text-muted-foreground">
                                    {new Date(repair.completedDate).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>

                            {(repair.quotedPrice || repair.finalPrice) && (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {repair.quotedPrice && (
                                  <div>
                                    <span className="font-medium">Quoted Price:</span>
                                    <p className="text-muted-foreground">R{repair.quotedPrice}</p>
                                  </div>
                                )}
                                {repair.finalPrice && (
                                  <div>
                                    <span className="font-medium">Final Price:</span>
                                    <p className="text-muted-foreground">R{repair.finalPrice}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {repair.store && (
                              <div className="text-sm">
                                <span className="font-medium">Store:</span>
                                <span className="text-muted-foreground ml-2">{repair.store}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateToRepair(repair.id)}
                              className="w-full flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Repair Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Repair History</h3>
                    <p className="text-muted-foreground">
                      This client has no repair records on file.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}