import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { insertSaleSchema, type InventoryItem, type Client } from "@shared/schema";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesEntryModal({ isOpen, onClose }: SalesEntryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Array<{
    item: InventoryItem;
    salePrice: number;
  }>>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertSaleSchema),
    defaultValues: {
      clientId: undefined,
      saleDate: new Date(),
      totalAmount: 0,
      notes: "",
    },
  });

  // Fetch available inventory items
  const { data: inventoryData } = useQuery<{
    items: InventoryItem[];
    total: number;
  }>({
    queryKey: ["/api/inventory", { search: searchTerm, status: "in_stock", limit: 50 }],
    enabled: searchTerm.length > 2,
  });

  // Fetch clients for selection
  const { data: clientsData } = useQuery<{
    clients: Client[];
    total: number;
  }>({
    queryKey: ["/api/clients", { limit: 100 }],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/sales", data);
    },
    onSuccess: () => {
      toast({
        title: "Sale Recorded",
        description: "Sale has been successfully recorded and inventory updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      onClose();
      form.reset();
      setSelectedItems([]);
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
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const addItemToSale = (item: InventoryItem) => {
    if (selectedItems.some(selected => selected.item.id === item.id)) {
      toast({
        title: "Item Already Added",
        description: "This item is already in the sale",
        variant: "destructive",
      });
      return;
    }
    
    const itemPrice = item.price ? parseFloat(item.price) : 0;
    const newSelectedItems = [...selectedItems, { item, salePrice: itemPrice }];
    setSelectedItems(newSelectedItems);
    updateTotalAmount(newSelectedItems);
    setSearchTerm("");
  };

  const removeItemFromSale = (itemId: number) => {
    const newSelectedItems = selectedItems.filter(selected => selected.item.id !== itemId);
    setSelectedItems(newSelectedItems);
    updateTotalAmount(newSelectedItems);
  };

  const updateSalePrice = (itemId: number, newPrice: number) => {
    const newSelectedItems = selectedItems.map(selected =>
      selected.item.id === itemId ? { ...selected, salePrice: newPrice } : selected
    );
    setSelectedItems(newSelectedItems);
    updateTotalAmount(newSelectedItems);
  };

  const updateTotalAmount = (items: Array<{ item: InventoryItem; salePrice: number }>) => {
    const total = items.reduce((sum, selected) => sum + selected.salePrice, 0);
    form.setValue("totalAmount", total);
  };

  const onSubmit = (data: any) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      ...data,
      items: selectedItems.map(selected => ({
        inventoryItemId: selected.item.id,
        salePrice: selected.salePrice,
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
          <DialogDescription>
            Add items to the sale and assign to a customer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientsData?.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sale Date */}
            <FormField
              control={form.control}
              name="saleDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Sale Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Item Search and Selection */}
            <div className="space-y-4">
              <div>
                <FormLabel>Search Items to Add</FormLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, brand, or serial number..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchTerm.length > 2 && inventoryData?.items && (
                <div className="border rounded-lg p-4 max-h-32 overflow-y-auto">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Available Items ({inventoryData.items.length})
                  </div>
                  <div className="space-y-2">
                    {inventoryData.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer"
                        onClick={() => addItemToSale(item)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-sm text-slate-500">
                            {item.brand} - {item.serialNumber} - R{item.price.toFixed(2)}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Items in Sale ({selectedItems.length})
                  </div>
                  <div className="space-y-2">
                    {selectedItems.map((selected) => (
                      <div key={selected.item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{selected.item.name}</div>
                          <div className="text-sm text-slate-500">
                            {selected.item.brand} - {selected.item.serialNumber}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24"
                            value={selected.salePrice}
                            onChange={(e) => updateSalePrice(selected.item.id, parseFloat(e.target.value) || 0)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItemFromSale(selected.item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total Amount */}
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount (ZAR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      readOnly
                      className="bg-slate-50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this sale..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSaleMutation.isPending || selectedItems.length === 0}
              >
                {createSaleMutation.isPending ? "Recording..." : "Record Sale"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}