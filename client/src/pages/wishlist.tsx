import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistItem } from "@shared/schema";

export default function Wishlist() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Customer Requests</h3>
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
                      <Button size="sm" variant="outline">
                        <i className="fas fa-eye mr-2"></i>
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <i className="fas fa-check mr-2"></i>
                        Mark Fulfilled
                      </Button>
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
    </>
  );
}
