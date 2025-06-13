import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SalesData {
  month: string;
  revenue: number;
  transactions: number;
}

interface SalesAnalyticsProps {
  salesData: SalesData[];
  title?: string;
}

const mockSalesData: SalesData[] = [
  { month: 'Jan', revenue: 4000, transactions: 8 },
  { month: 'Feb', revenue: 3000, transactions: 6 },
  { month: 'Mar', revenue: 5000, transactions: 10 },
  { month: 'Apr', revenue: 2780, transactions: 5 },
  { month: 'May', revenue: 1890, transactions: 4 },
  { month: 'Jun', revenue: 2390, transactions: 7 },
];

export default function SalesAnalytics({ 
  salesData = mockSalesData, 
  title = "Sales Analytics" 
}: SalesAnalyticsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View Details
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly" className="text-xs">Quarterly</TabsTrigger>
          <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
          <TabsTrigger value="ytd" className="text-xs">YTD</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="quarterly" className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData.slice(0, 4)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="yearly" className="space-y-4">
          <div className="h-64 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <i className="fas fa-chart-line text-4xl mb-4"></i>
              <p>Yearly data coming soon</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="ytd" className="space-y-4">
          <div className="h-64 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <i className="fas fa-calendar text-4xl mb-4"></i>
              <p>Year-to-date analysis coming soon</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {salesData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">Total Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {salesData.reduce((sum, item) => sum + item.transactions, 0)}
          </p>
          <p className="text-sm text-slate-500">Transactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {Math.round(salesData.reduce((sum, item) => sum + item.revenue, 0) / salesData.reduce((sum, item) => sum + item.transactions, 0)).toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">Avg. Order</p>
        </div>
      </div>
    </Card>
  );
}