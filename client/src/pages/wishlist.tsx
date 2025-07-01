import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";
import WishlistTable from "@/components/wishlist-table";

export default function Wishlist() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  
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

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setBrandFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (brandFilter !== "all") count++;
    if (dateRange.from || dateRange.to) count++;
    return count;
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Wishlist Management" />
      <div className="container-mobile py-2 sm:py-4 lg:py-6">
        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white rounded-lg border p-6 mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by client name, item name, brand, SKU references..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="watches">Watches</SelectItem>
                  <SelectItem value="leather">Leather Goods</SelectItem>
                  <SelectItem value="pens">Pens</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Brand</label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="Rolex">Rolex</SelectItem>
                  <SelectItem value="Tudor">Tudor</SelectItem>
                  <SelectItem value="Breitling">Breitling</SelectItem>
                  <SelectItem value="Montblanc">Montblanc</SelectItem>
                  <SelectItem value="Omega">Omega</SelectItem>
                  <SelectItem value="Cartier">Cartier</SelectItem>
                  <SelectItem value="TAG Heuer">TAG Heuer</SelectItem>
                  <SelectItem value="Panerai">Panerai</SelectItem>
                  <SelectItem value="A. Lange & Söhne">A. Lange & Söhne</SelectItem>
                  <SelectItem value="Various">Various</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Created Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange({ 
                      from: range?.from || undefined, 
                      to: range?.to || undefined 
                    })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters and Clear Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
              </span>
              {getActiveFilterCount() > 0 && (
                <div className="flex gap-1">
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      Search: {searchTerm.substring(0, 20)}{searchTerm.length > 20 ? '...' : ''}
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Status: {statusFilter}
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Category: {categoryFilter}
                    </Badge>
                  )}
                  {brandFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      Brand: {brandFilter}
                    </Badge>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <Badge variant="secondary" className="text-xs">
                      Date Range
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {getActiveFilterCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <WishlistTable 
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          brandFilter={brandFilter}
          dateRange={dateRange}
        />
      </div>
    </>
  );
}