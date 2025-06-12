import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { InventoryItem } from "@shared/schema";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export default function ItemDetailsModal({ 
  isOpen, 
  onClose, 
  item, 
  onEdit, 
  onDelete 
}: ItemDetailsModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update notes value when item changes
  useEffect(() => {
    if (item) {
      setNotesValue(item.notes || "");
    }
  }, [item]);

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return await apiRequest(`/api/inventory/${item?.id}`, "PATCH", {
        notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes updated",
        description: "Item notes have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsEditingNotes(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating notes:", error);
    },
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notesValue);
  };

  const handleCancelEdit = () => {
    setNotesValue(item?.notes || "");
    setIsEditingNotes(false);
  };

  if (!item) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            {item.brand} - {item.serialNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <div className="w-full">
                {item.imageUrls.length === 1 ? (
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={item.imageUrls[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = 
                          '<div class="flex items-center justify-center h-full"><i class="fas fa-image text-slate-400 text-4xl"></i></div>';
                      }}
                    />
                  </div>
                ) : (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {item.imageUrls.map((image, index) => (
                        <CarouselItem key={index}>
                          <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                            <img
                              src={image}
                              alt={`${item.name} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = 
                                  '<div class="flex items-center justify-center h-full"><i class="fas fa-image text-slate-400 text-4xl"></i></div>';
                              }}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                )}
                <p className="text-xs text-slate-500 text-center mt-2">
                  {item.imageUrls.length} image{item.imageUrls.length !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-image text-slate-400 text-4xl mb-2"></i>
                  <p className="text-slate-500 text-sm">No images available</p>
                </div>
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Status</span>
                    <Badge className={getStatusColor(item.status)}>
                      {formatStatus(item.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Price</span>
                    <span className="text-lg font-bold text-green-600">
                      R{item.price ? parseFloat(item.price).toLocaleString() : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Category</span>
                    <Badge variant="outline" className="capitalize">
                      {item.category.replace("-", " ")}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-slate-600">Serial Number</span>
                    <p className="text-slate-900 font-mono text-sm mt-1">{item.serialNumber}</p>
                  </div>

                  {item.sku && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">SKU</span>
                      <p className="text-slate-900 font-mono text-sm mt-1">{item.sku}</p>
                    </div>
                  )}

                  {item.description && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Description</span>
                      <p className="text-slate-900 text-sm mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  )}

                  {/* Notes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">Notes</span>
                      {!isEditingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNotes(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this item..."
                          className="min-h-[100px] text-sm"
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={updateNotesMutation.isPending}
                            className="h-7 px-3 text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            {updateNotesMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updateNotesMutation.isPending}
                            className="h-7 px-3 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-slate-900 text-sm mt-1 leading-relaxed min-h-[60px] p-3 bg-slate-50 rounded-md border cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        {notesValue || (
                          <span className="text-slate-400 italic">Click to add notes...</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-500">
                      {item.createdAt && (
                        <div>
                          <span className="font-medium">Added:</span> {format(new Date(item.createdAt), 'MMM d, yyyy at h:mm a')}
                        </div>
                      )}
                      {item.updatedAt && item.updatedAt !== item.createdAt && (
                        <div>
                          <span className="font-medium">Updated:</span> {format(new Date(item.updatedAt), 'MMM d, yyyy at h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onEdit(item)}
              >
                <i className="fas fa-edit mr-2"></i>
                Edit Item
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 hover:border-red-300 hover:bg-red-50"
                onClick={() => onDelete(item)}
              >
                <i className="fas fa-trash text-red-500 mr-2"></i>
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}