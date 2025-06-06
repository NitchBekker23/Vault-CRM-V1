import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInventoryItemSchema, type InsertInventoryItem } from "@shared/schema";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUpload from "./image-upload";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertInventoryItemSchema;

export default function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      serialNumber: "",
      sku: "",
      category: "",
      price: "",
      status: "in_stock",
      imageUrls: [],
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const response = await apiRequest("POST", "/api/inventory", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      form.reset();
      onClose();
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
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInventoryItem) => {
    createItemMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new inventory item to your collection
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rolex Submariner Date" {...field} />
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
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rolex" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 126610LN" {...field} />
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
                      <Input placeholder="Internal SKU" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the item..."
                      className="h-24"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="watches">Watches</SelectItem>
                        <SelectItem value="leather-goods">Leather Goods</SelectItem>
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
                    <FormLabel>Price (ZAR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>Product Images</FormLabel>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-600 transition-colors cursor-pointer mt-2">
                <i className="fas fa-cloud-upload-alt text-3xl text-slate-400 mb-3"></i>
                <p className="text-slate-600">Drag and drop images here, or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Supports: JPG, PNG, WebP (Max 5MB each)</p>
                <input type="file" className="hidden" multiple accept="image/*" />
              </div>
            </div>
            
            <ImageUpload
              images={form.watch("imageUrls") || []}
              onImagesChange={(images) => form.setValue("imageUrls", images)}
              maxImages={5}
            />
            
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createItemMutation.isPending}
              >
                {createItemMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Adding...
                  </>
                ) : (
                  "Add Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
