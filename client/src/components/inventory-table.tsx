import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Plus, Upload, Eye, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryItem } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";
import BulkUploadModal from "./bulk-upload-modal";
import ItemDetailsModal from "./item-details-modal";
import InventoryCardView from "./inventory-card-view";

interface InventoryTableProps {
  showHeader?: boolean;
  limit?: number;
  allowBulkActions?: boolean;
}

type SortField = 'price' | 'daysInStock' | null;
type SortDirection = 'asc' | 'desc';

export default function InventoryTable({ showHeader = true, limit, allowBulkActions = true }: InventoryTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(limit || 10);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();

  const { data: inventoryData, isLoading } = useQuery<{
    items: InventoryItem[];
    total: number;
  }>({
    queryKey: ["/api/inventory", page, pageSize, search, category, status, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search.trim() && { search: search.trim() }),
        ...(category && { category }),
        ...(status && { status }),
        ...(dateRange && { dateRange }),
      });
      
      const response = await fetch(`/api/inventory?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/inventory/${id}`, "DELETE");
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      console.log("Bulk deleting IDs:", ids);
      const response = await fetch("/api/inventory/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      setShowBulkDeleteDialog(false);
      setSelectedItems(new Set());
      toast({
        title: "Success",
        description: `${selectedItems.size} items deleted successfully`,
      });
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
        description: "Failed to delete items. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (checked) {
      newSelectedItems.add(id);
    } else {
      newSelectedItems.delete(id);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && sortedItems.length > 0) {
      setSelectedItems(new Set(sortedItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedItem) {
      deleteItemMutation.mutate(selectedItem.id);
    }
  };

  const confirmBulkDelete = () => {
    if (selectedItems.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedItems));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "reserved":
        return "bg-yellow-100 text-yellow-800";
      case "sold":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "reserved":
        return "Reserved";
      case "sold":
        return "Sold";
      default:
        return status;
    }
  };

  const calculateDaysInStock = (dateReceived: string | Date) => {
    if (!dateReceived) return 0;
    const receivedDate = new Date(dateReceived);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - receivedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Sort the inventory data
  const sortedItems = inventoryData?.items ? [...inventoryData.items].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: number | undefined;
    let bValue: number | undefined;
    
    if (sortField === 'price') {
      aValue = a.price ? parseFloat(a.price) : 0;
      bValue = b.price ? parseFloat(b.price) : 0;
    } else if (sortField === 'daysInStock') {
      aValue = a.dateReceived ? calculateDaysInStock(a.dateReceived) : 0;
      bValue = b.dateReceived ? calculateDaysInStock(b.dateReceived) : 0;
    }
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    const comparison = aValue - bValue;
    return sortDirection === 'asc' ? comparison : -comparison;
  }) : [];

  const totalPages = inventoryData ? Math.ceil(inventoryData.total / pageSize) : 0;

  return (
    <>
      <Card>
        {showHeader && (
          <div className="p-4 lg:px-6 lg:py-4 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {limit ? "Recent Inventory" : "Inventory Management"}
              </h3>
              
              {/* Mobile-first responsive controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search bar - full width on mobile */}
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <Input
                    type="text"
                    placeholder="Search inventory..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                {/* Filters - stacked on mobile, inline on tablet+ */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Select value={category || "all"} onValueChange={(value) => {
                    const newCategory = value === "all" ? "" : value;
                    setCategory(newCategory);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="watches">Watches</SelectItem>
                      <SelectItem value="leather-goods">Leather Goods</SelectItem>
                      <SelectItem value="pens">Pens</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={status || "all"} onValueChange={(value) => {
                    const newStatus = value === "all" ? "" : value;
                    setStatus(newStatus);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={dateRange || "all"} onValueChange={(value) => {
                    const newDateRange = value === "all" ? "" : value;
                    setDateRange(newDateRange);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                      <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                      <SelectItem value="over-90-days">Over 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {!limit && (
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      const newPageSize = parseInt(value);
                      setPageSize(newPageSize);
                      setPage(1);
                    }}>
                      <SelectTrigger className="w-full sm:w-24">
                        <SelectValue placeholder={pageSize.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                {/* Action buttons - responsive sizing */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {isMobile ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBulkUploadModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      {allowBulkActions && selectedItems.size > 0 && (
                        <Button 
                          onClick={handleBulkDelete} 
                          variant="outline"
                          className="w-full sm:w-auto border-red-200 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Delete ({selectedItems.size})
                        </Button>
                      )}
                      <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setShowBulkUploadModal(true)}>
                        <i className="fas fa-upload mr-2"></i>
                        Bulk Import
                      </Button>
                      {allowBulkActions && selectedItems.size > 0 && (
                        <Button 
                          onClick={handleBulkDelete} 
                          variant="outline"
                          className="border-red-200 hover:border-red-300 hover:bg-red-50"
                        >
                          <i className="fas fa-trash text-red-500 mr-2"></i>
                          Delete Selected ({selectedItems.size})
                        </Button>
                      )}
                      <Button onClick={() => setShowAddModal(true)}>
                        <i className="fas fa-plus mr-2"></i>
                        Add Item
                      </Button>
                    </>
                  )}
                </div>
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
              {/* Mobile Card View */}
              {isMobile ? (
                <div className="p-4 space-y-4">
                  {allowBulkActions && (
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={sortedItems.length > 0 && selectedItems.size === sortedItems.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-slate-600">Select all</span>
                      </div>
                      {selectedItems.size > 0 && (
                        <span className="text-sm text-slate-600">
                          {selectedItems.size} selected
                        </span>
                      )}
                    </div>
                  )}
                  {sortedItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {allowBulkActions && (
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                              className="mt-1"
                            />
                          )}
                          
                          {/* Item Image */}
                          <div 
                            className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors flex-shrink-0"
                            onClick={() => handleViewDetails(item)}
                          >
                            {item.imageUrls && item.imageUrls.length > 0 ? (
                              <img
                                src={item.imageUrls[0]}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<i class="fas fa-image text-slate-400"></i>';
                                }}
                              />
                            ) : (
                              <i className="fas fa-image text-slate-400 text-lg"></i>
                            )}
                          </div>
                          
                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div 
                              className="cursor-pointer" 
                              onClick={() => handleViewDetails(item)}
                            >
                              <h4 className="font-medium text-slate-900 hover:text-blue-600 transition-colors truncate">
                                {item.name}
                              </h4>
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">SKU:</span>
                                <span className="text-sm font-medium text-slate-900">{item.sku || item.serialNumber}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Brand:</span>
                                <span className="text-sm font-medium text-slate-900">{item.brand}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Category:</span>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {item.category.replace("-", " ")}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Status:</span>
                                <Badge className={`${getStatusColor(item.status)} text-xs`}>
                                  {formatStatus(item.status)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Price:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  {item.price ? `R${parseFloat(item.price).toLocaleString()}` : "-"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Days in Stock:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  {item.dateReceived ? `${calculateDaysInStock(item.dateReceived)} days` : "-"}
                                </span>
                              </div>
                            </div>
                            
                            {/* Mobile Actions */}
                            <div className="mt-4 flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => handleViewDetails(item)} className="flex-1">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)} className="flex-1">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                          
                          {/* Mobile Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(item)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {allowBulkActions && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={sortedItems.length > 0 && selectedItems.size === sortedItems.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Price</span>
                            {getSortIcon('price')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                          onClick={() => handleSort('daysInStock')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Days in Stock</span>
                            {getSortIcon('daysInStock')}
                          </div>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          {allowBulkActions && (
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div 
                                className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors"
                                onClick={() => handleViewDetails(item)}
                              >
                                {item.imageUrls && item.imageUrls.length > 0 ? (
                                  <img
                                    src={item.imageUrls[0]}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = '<i class="fas fa-image text-slate-400"></i>';
                                    }}
                                  />
                                ) : (
                                  <i className="fas fa-image text-slate-400"></i>
                                )}
                              </div>
                              <div className="cursor-pointer flex-1" onClick={() => handleViewDetails(item)}>
                                <div className="font-medium text-slate-900 hover:text-blue-600 transition-colors">{item.name}</div>
                                <div className="text-sm text-slate-500">
                                  {item.description?.substring(0, 50)}
                                  {item.description && item.description.length > 50 ? "..." : ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-900">{item.sku || item.serialNumber}</TableCell>
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
                          <TableCell className="text-slate-600">
                            {item.dateReceived ? `${calculateDaysInStock(item.dateReceived)} days` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                <i className="fas fa-edit mr-1"></i>
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {!limit && (
                <div className={`${isMobile ? 'p-4' : 'px-6 py-4'} border-t border-slate-200`}>
                  <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <p className={`text-sm text-slate-700 ${isMobile ? 'text-center' : ''}`}>
                      Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(page * pageSize, inventoryData.total)}
                      </span>{" "}
                      of <span className="font-medium">{inventoryData.total}</span> results
                    </p>
                    <div className={`flex items-center ${isMobile ? 'justify-center' : ''} space-x-2`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={isMobile ? 'px-3' : ''}
                      >
                        {isMobile ? '‹' : 'Previous'}
                      </Button>
                      {isMobile ? (
                        <span className="text-sm text-slate-600 px-4">
                          {page} of {totalPages}
                        </span>
                      ) : (
                        [...Array(Math.min(5, totalPages))].map((_, i) => {
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
                        })
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className={isMobile ? 'px-3' : ''}
                      >
                        {isMobile ? '›' : 'Next'}
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

      <ItemDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onEdit={(item) => {
          setShowDetailsModal(false);
          handleEdit(item);
        }}
        onDelete={(item) => {
          setShowDetailsModal(false);
          handleDelete(item);
        }}
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

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} selected items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItems(new Set())}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
