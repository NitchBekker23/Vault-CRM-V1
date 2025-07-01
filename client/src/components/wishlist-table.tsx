import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreVertical,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  Phone,
  Mail,
  Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WishlistItem } from "@shared/schema";

export default function WishlistTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: wishlistData, isLoading } = useQuery<{
    items: WishlistItem[];
  }>({
    queryKey: ["/api/wishlist", search, status, category, brand],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (status && status !== "all") params.append("status", status);
      if (category && category !== "all") params.append("category", category);
      if (brand && brand !== "all") params.append("brand", brand);
      
      const response = await fetch(`/api/wishlist?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch wishlist items: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/wishlist/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Success",
        description: "Wishlist item deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete wishlist item",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/wishlist/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Success",
        description: "Wishlist item status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4" />;
      case "fulfilled":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "fulfilled":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wishlist Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = wishlistData?.items || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Wishlist Items</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by client, item, brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="watches">Watches</SelectItem>
                  <SelectItem value="leather_goods">Leather Goods</SelectItem>
                  <SelectItem value="pens">Pens</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="Rolex">Rolex</SelectItem>
                  <SelectItem value="Montblanc">Montblanc</SelectItem>
                  <SelectItem value="Tudor">Tudor</SelectItem>
                  <SelectItem value="Breitling">Breitling</SelectItem>
                  <SelectItem value="Various">Various</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {search && (
              <div className="text-sm text-muted-foreground">
                Found {items.length} result{items.length !== 1 ? 's' : ''} for "{search}"
              </div>
            )}
          </div>

          {/* Table */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wishlist items found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Item Details</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Max Price</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.clientName}</span>
                          </div>
                          {item.clientCompany && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building className="h-3 w-3" />
                              <span>{item.clientCompany}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.brand} • {item.category}
                          </div>
                          {item.skuReferences && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Package className="h-3 w-3" />
                              <span>SKU: {JSON.parse(item.skuReferences).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {item.clientEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{item.clientEmail}</span>
                            </div>
                          )}
                          {item.clientPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{item.clientPhone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {item.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.maxPrice ? `R ${item.maxPrice}` : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: "fulfilled" })}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Fulfilled
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: "cancelled" })}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Mark as Cancelled
                                </DropdownMenuItem>
                              </>
                            )}
                            {item.status === "fulfilled" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "active" })}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedItem(item);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the wishlist item for {selectedItem?.clientName}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}