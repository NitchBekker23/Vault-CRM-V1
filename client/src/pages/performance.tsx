import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, TrendingUp, Banknote, Calendar, Filter, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StorePerformance {
  store_id: number;
  store_name: string;
  store_code: string;
  total_sales: number;
  total_revenue: string;
  total_profit: string;
  month: number;
  year: number;
}

interface SalesPersonPerformance {
  sales_person_id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  store_name: string;
  total_sales: number;
  total_revenue: string;
  total_profit: string;

  month: number;
  year: number;
}

export default function Performance() {
  // State for date filtering
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  
  // State for additional filters
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');

  // Generate year options (current year and 3 years back)
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i);
  
  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Build query parameters
  const buildStoreQuery = () => {
    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
    });
    if (selectedStore !== 'all') {
      params.append('storeId', selectedStore);
    }
    return `/api/performance/stores?${params.toString()}`;
  };

  const buildSalesPersonQuery = () => {
    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
    });
    if (selectedSalesPerson !== 'all') {
      params.append('salesPersonId', selectedSalesPerson);
    }
    return `/api/performance/sales-persons?${params.toString()}`;
  };

  const { data: storePerformance, isLoading: storeLoading } = useQuery<StorePerformance[]>({
    queryKey: [buildStoreQuery()],
    retry: false,
  });

  const { data: salesPersonPerformance, isLoading: salesPersonLoading } = useQuery<SalesPersonPerformance[]>({
    queryKey: [buildSalesPersonQuery()],
    retry: false,
  });

  // Get list of stores for filter dropdown
  const { data: storesList } = useQuery<{id: number, name: string, code: string}[]>({
    queryKey: ['/api/stores'],
    retry: false,
  });

  // Get list of sales persons for filter dropdown
  const { data: salesPersonsList } = useQuery<{id: number, firstName: string, lastName: string, employeeId: string}[]>({
    queryKey: ['/api/sales-persons'],
    retry: false,
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalStoreRevenue = storePerformance?.reduce((sum, store) => sum + parseFloat(store.total_revenue), 0) || 0;
  const totalStoreProfit = storePerformance?.reduce((sum, store) => sum + parseFloat(store.total_profit), 0) || 0;
  // Commission system removed as requested

  // Get month name for display
  const getMonthName = (month: number) => {
    return monthOptions.find(m => m.value === month)?.label || '';
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSelectedStore('all');
    setSelectedSalesPerson('all');
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
  };

  // Filter display data based on selections
  const filteredStorePerformance = storePerformance?.filter(store => {
    if (selectedStore === 'all') return true;
    return store.store_id.toString() === selectedStore;
  });

  const filteredSalesPersonPerformance = salesPersonPerformance?.filter(person => {
    if (selectedSalesPerson === 'all') return true;
    return person.sales_person_id.toString() === selectedSalesPerson;
  });

  // Check if any filters are active
  const hasActiveFilters = selectedStore !== 'all' || selectedSalesPerson !== 'all' || 
    selectedYear !== currentDate.getFullYear() || selectedMonth !== (currentDate.getMonth() + 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Performance Analytics</h1>
        
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Date Display Badge */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm">
              {getMonthName(selectedMonth)} {selectedYear}
            </Badge>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Year Filter */}
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Month Filter */}
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Store Filter */}
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {storesList?.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sales Person Filter */}
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Sales Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Staff</SelectItem>
                {salesPersonsList?.map((person) => (
                  <SelectItem key={person.id} value={person.id.toString()}>
                    {person.firstName} {person.lastName} ({person.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalStoreRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalStoreProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {salesPersonPerformance?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storePerformance?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stores">Store Performance</TabsTrigger>
          <TabsTrigger value="sales-persons">Sales Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store Performance - {monthOptions.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {storeLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStorePerformance?.map((store) => (
                    <div key={store.store_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{store.store_name}</h3>
                          <Badge variant="secondary">#{store.store_code}</Badge>
                        </div>
                        <Badge variant="outline">
                          {store.total_sales} sale{store.total_sales !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(store.total_revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(store.total_profit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!storePerformance || storePerformance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No store performance data available for this period.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-persons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Team Performance - {monthOptions.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {salesPersonLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSalesPersonPerformance?.map((person) => (
                    <div key={person.sales_person_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">
                            {person.first_name} {person.last_name}
                          </h3>
                          <Badge variant="secondary">#{person.employee_id}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{person.store_name}</Badge>
                          <Badge variant="outline">
                            {person.total_sales} sale{person.total_sales !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(person.total_revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit Generated</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(person.total_profit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Performance</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {person.total_sales} Sales
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!salesPersonPerformance || salesPersonPerformance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No sales person performance data available for this period.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}