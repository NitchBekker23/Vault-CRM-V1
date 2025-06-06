import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddWishlistModal from "@/components/add-wishlist-modal";
import { WishlistItem } from "@shared/schema";

export default function Wishlist() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const fulfillWishlistMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/wishlist/${id}`, { status: "fulfilled" });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wishlist request marked as fulfilled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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
        description: "Failed to update wishlist item. Please try again.",
        variant: "destructive",
      });
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

  const { data: wishlistData, isLoading: isLoadingWishlist, error } = useQuery<{
    items: WishlistItem[];
    total: number;
  }>({
    queryKey: ["/api/wishlist"],
    enabled: isAuthenticated,
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

  if (isLoading || !isAuthenticated || isLoadingWishlist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Wishlist & Demand Tracking" />
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Customer Requests</h3>
            <Button onClick={() => setShowAddModal(true)}>
              <i className="fas fa-plus mr-2"></i>
              Add Wishlist Request
            </Button>
          </div>
          {wishlistData?.items && wishlistData.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistData.items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.itemName}</CardTitle>
                    <CardDescription>{item.brand}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge 
                        variant={item.status === "active" ? "default" : "secondary"}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    {item.maxPrice && (
                      <p className="text-sm text-slate-600 mb-4">
                        Max Budget: ${parseFloat(item.maxPrice).toLocaleString()}
                      </p>
                    )}
                    <div className="flex space-x-2">
                      {item.status === "active" && (
                        <Button 
                          size="sm" 
                          onClick={() => fulfillWishlistMutation.mutate(item.id)}
                          disabled={fulfillWishlistMutation.isPending}
                        >
                          <i className="fas fa-check mr-2"></i>
                          {fulfillWishlistMutation.isPending ? "Updating..." : "Mark Fulfilled"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <i className="fas fa-heart text-4xl text-slate-300 mb-4"></i>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No wishlist requests</h3>
                  <p className="text-slate-500">Customer wishlist requests will appear here.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddWishlistModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </>
  );
}
