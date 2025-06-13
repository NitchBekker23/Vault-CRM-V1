import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const editInventorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  serialNumber: z.string().min(1, "Serial number is required"),
  sku: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.string().optional(),
  status: z.enum(["in-stock", "reserved", "sold"]),
  notes: z.string().optional(),
});

type EditInventoryFormData = z.infer<typeof editInventorySchema>;

interface EditInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
}

export default function EditInventoryModal({ open, onOpenChange, item }: EditInventoryModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const form = useForm<EditInventoryFormData>({
    resolver: zodResolver(editInventorySchema),
    defaultValues: {
      name: "",
      brand: "",
      serialNumber: "",
      sku: "",
      category: "",
      price: "",
      status: "in-stock",
      notes: "",
    },
  });

  // Update form when item changes
  useEffect(() => {
    if (item && open) {
      const formData = {
        name: item.name || "",
        brand: item.brand || "",
        serialNumber: item.serialNumber || "",
        sku: item.sku || "",
        category: item.category || "",
        price: item.price ? item.price.toString() : "",
        status: item.status || "in-stock",
        notes: item.notes || "",
      };
      
      console.log("Loading item data:", item);
      console.log("Setting form data:", formData);
      
      form.reset(formData);
      
      // Load existing images if any
      if (item.images) {
        setExistingImages(item.images);
      } else {
        setExistingImages([]);
      }
    }
  }, [item, open, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditInventoryFormData) => {
      console.log("Submitting form data:", data);
      
      const formData = new FormData();
      
      // Add form fields - ensure all fields are included
      if (data.name) formData.append('name', data.name);
      if (data.brand) formData.append('brand', data.brand);
      if (data.serialNumber) formData.append('serialNumber', data.serialNumber);
      if (data.sku) formData.append('sku', data.sku);
      if (data.category) formData.append('category', data.category);
      if (data.status) formData.append('status', data.status);
      if (data.notes) formData.append('notes', data.notes);
      if (data.price) formData.append('price', data.price);

      // Add images
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      onOpenChange(false);
      setSelectedImages([]);
      setExistingImages([]);
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
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validImages = files.filter(file => file.type.startsWith('image/'));
    
    if (validImages.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Please select only image files",
        variant: "destructive",
      });
    }
    
    setSelectedImages(prev => [...prev, ...validImages]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: EditInventoryFormData) => {
    updateMutation.mutate(data);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.name}</DialogTitle>
          <DialogDescription>
            Update item details, add notes, and manage images.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Serial number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Watches">Watches</SelectItem>
                        <SelectItem value="Leather Goods">Leather Goods</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (R)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in-stock">In Stock</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Add any additional notes about this item..." 
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Images Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Current Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {existingImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={image} 
                            alt={`Item ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removeExistingImage(index)}
                          >
                            <i className="fas fa-times text-xs"></i>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images */}
                {selectedImages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">New Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={URL.createObjectURL(image)} 
                            alt={`New ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <i className="fas fa-times text-xs"></i>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Images */}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Select multiple images to add to this item
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="min-w-24"
              >
                {updateMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}