import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Eye, Package } from "lucide-react";
import { InventoryItem } from "@shared/schema";
import EditItemModal from "./edit-item-modal";
import ItemDetailsModal from "./item-details-modal";

interface InventoryCardViewProps {
  items: InventoryItem[];
  onItemUpdated: () => void;
}

export default function InventoryCardView({ items, onItemUpdated }: InventoryCardViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      onItemUpdated();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in stock':
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'sold':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatPrice = (price: string | number | null) => {
    if (!price) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? 'N/A' : `$${numPrice.toLocaleString()}`;
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleView = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleDelete = (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No inventory items found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3 sm:p-4">
              {/* Header with title and actions */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white break-words">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                    {item.brand}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(item)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Details grid */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
                  <span className="text-sm font-medium break-words">{item.category}</span>
                </div>
                
                {item.serialNumber && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Serial:</span>
                    <span className="text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                      {item.serialNumber}
                    </span>
                  </div>
                )}

                {item.sku && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">SKU:</span>
                    <span className="text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                      {item.sku}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Price:</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatPrice(item.price)}
                  </span>
                </div>

                {/* Status and date row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                  <Badge className={`${getStatusColor(item.status)} text-xs px-2 py-1`}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Added {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {item.notes && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 break-words line-clamp-3">
                      {item.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons for mobile */}
              <div className="flex gap-2 mt-3 sm:hidden">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleView(item)}
                  className="flex-1 text-xs h-8"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(item)}
                  className="flex-1 text-xs h-8"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      {selectedItem && (
        <>
          <EditItemModal
            item={selectedItem}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
              onItemUpdated();
            }}
          />
          <ItemDetailsModal
            item={selectedItem}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedItem(null);
            }}
            onEdit={(item) => {
              setSelectedItem(item);
              setShowDetailsModal(false);
              setShowEditModal(true);
            }}
            onDelete={(item) => {
              setShowDetailsModal(false);
              handleDelete(item);
            }}
          />
        </>
      )}
    </>
  );
}