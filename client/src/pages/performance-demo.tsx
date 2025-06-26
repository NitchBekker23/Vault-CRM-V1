import { useState, useEffect, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, DollarSign } from "lucide-react";
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
  commission: string;
  month: number;
  year: number;
}

export default function PerformanceDemo() {
  const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([]);
  const [salesPersonPerformance, setSalesPersonPerformance] = useState<SalesPersonPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        startTransition(() => {
          setIsLoading(true);
        });
        
        // First, login to get authenticated session
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nitchbekker@gmail.com',
            password: 'admin123'
          }),
          credentials: 'include'
        });

        if (!loginResponse.ok) {
          throw new Error('Authentication failed');
        }

        // Fetch store performance data
        const storeResponse = await fetch('/api/performance/stores?month=10&year=2025', {
          credentials: 'include'
        });
        
        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          startTransition(() => {
            setStorePerformance(storeData);
          });
        }

        // Fetch sales person performance data
        const salesPersonResponse = await fetch('/api/performance/sales-persons?month=10&year=2025', {
          credentials: 'include'
        });
        
        if (salesPersonResponse.ok) {
          const salesPersonData = await salesPersonResponse.json();
          startTransition(() => {
            setSalesPersonPerformance(salesPersonData);
          });
        }

      } catch (err) {
        startTransition(() => {
          setError('Failed to load performance data');
        });
        console.error('Error loading performance data:', err);
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalStoreRevenue = storePerformance.reduce((sum, store) => sum + parseFloat(store.total_revenue), 0);
  const totalStoreProfit = storePerformance.reduce((sum, store) => sum + parseFloat(store.total_profit), 0);
  const totalCommissions = salesPersonPerformance.reduce((sum, person) => sum + parseFloat(person.commission), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Analytics Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          October 2025
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalCommissions)}
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
              {storePerformance.length}
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
              <CardTitle>Store Performance - October 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storePerformance.map((store) => (
                  <div key={store.store_id} className="border rounded-lg p-4 bg-white">
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
                {storePerformance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No store performance data available for this period.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-persons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Team Performance - October 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesPersonPerformance.map((person) => (
                  <div key={person.sales_person_id} className="border rounded-lg p-4 bg-white">
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
                        <p className="text-sm text-muted-foreground">Commission</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {formatCurrency(person.commission)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {salesPersonPerformance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sales person performance data available for this period.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}