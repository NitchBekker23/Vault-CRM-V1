import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
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
import { InventoryItem } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";
import BulkUploadModal from "./bulk-upload-modal";

interface InventoryTableProps {
  showHeader?: boolean;
  limit?: number;
}

export default function InventoryTable({ showHeader = true, limit }: InventoryTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventoryData, isLoading } = useQuery<{
    items: InventoryItem[];
    total: number;
  }>({
    queryKey: ["/api/inventory", { 
      page, 
      search: search.trim() || undefined, 
      category: category || undefined, 
      status: status || undefined, 
      limit 
    }],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      setShowDeleteDialog(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedItem) {
      deleteItemMutation.mutate(selectedItem.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "sold":
        return "bg-red-100 text-red-800";
      case "out_of_stock":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "sold":
        return "Sold";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  const totalPages = inventoryData ? Math.ceil(inventoryData.total / (limit || 10)) : 0;

  return (
    <>
      <Card>
        {showHeader && (
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {limit ? "Recent Inventory" : "Inventory Management"}
              </h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <Input
                    type="text"
                    placeholder="Search inventory..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="watches">Watches</SelectItem>
                    <SelectItem value="leather-goods">Leather Goods</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setShowBulkUploadModal(true)}>
                  <i className="fas fa-upload mr-2"></i>
                  Bulk Import
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/6" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ) : inventoryData?.items && inventoryData.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Serial/SKU</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <i className="fas fa-image text-slate-400"></i>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{item.name}</div>
                              <div className="text-sm text-slate-500">
                                {item.description?.substring(0, 50)}
                                {item.description && item.description.length > 50 ? "..." : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-900">{item.serialNumber}</TableCell>
                        <TableCell className="text-slate-900">{item.brand}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.category.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {formatStatus(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-900">
                          {item.price ? `R${parseFloat(item.price).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(item)}
                              className="border-red-200 hover:border-red-300 hover:bg-red-50"
                            >
                              <i className="fas fa-trash text-red-500 mr-1"></i>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {!limit && (
                <div className="px-6 py-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-700">
                      Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(page * 10, inventoryData.total)}
                      </span>{" "}
                      of <span className="font-medium">{inventoryData.total}</span> results
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-boxes text-4xl text-slate-300 mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No inventory items</h3>
              <p className="text-slate-500 mb-4">Start by adding your first inventory item.</p>
              <Button onClick={() => setShowAddModal(true)}>
                <i className="fas fa-plus mr-2"></i>
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      <EditItemModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
      />

      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteItemMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
