import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import ModernPageHeader from "@/components/modern-page-header";
import ModernDataTable from "@/components/modern-data-table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Fetch clients data
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleAddClient = () => {
    console.log("Add new client");
  };

  const handleEdit = (client: any) => {
    console.log("Edit client:", client.id);
  };

  const handleDelete = (client: any) => {
    console.log("Delete client:", client.id);
  };

  const handleViewPurchases = (client: any) => {
    console.log("View purchases for client:", client.id);
  };

  const getVipBadge = (isVip: boolean) => {
    if (!isVip) return null;
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        VIP
      </Badge>
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'Client',
      sortable: true,
      render: (value: string, client: any) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {client.firstName?.[0]}{client.lastName?.[0]}
            </span>
          </div>
          <div>
            <div className="font-medium text-slate-900 flex items-center space-x-2">
              <span>{client.firstName} {client.lastName}</span>
              {getVipBadge(client.vipStatus)}
            </div>
            <div className="text-sm text-slate-500">{client.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value: string) => value || '-'
    },
    {
      key: 'totalPurchases',
      label: 'Purchases',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value || 0}</span>
      )
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">R {(value || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Client Since',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-slate-600">
          {formatDistanceToNow(new Date(value), { addSuffix: true })}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: 'View Purchases',
      icon: 'fas fa-shopping-bag',
      onClick: handleViewPurchases,
      variant: 'ghost' as const
    },
    {
      label: 'Edit',
      icon: 'fas fa-edit',
      onClick: handleEdit,
      variant: 'ghost' as const
    },
    {
      label: 'Delete',
      icon: 'fas fa-trash',
      onClick: handleDelete,
      variant: 'ghost' as const
    }
  ];

  const stats = [
    {
      label: 'Total Clients',
      value: (clientsData as any)?.total || 0,
      change: '+8%',
      trend: 'up' as const
    },
    {
      label: 'VIP Clients',
      value: 3, // This would come from filtered data
      change: '+15%',
      trend: 'up' as const
    },
    {
      label: 'Active This Month',
      value: 12, // This would come from activity data
      change: '+22%',
      trend: 'up' as const
    },
    {
      label: 'Avg. Order Value',
      value: 'R 45K',
      change: '+5%',
      trend: 'up' as const
    }
  ];

  return (
    <>
      <Header title="Client Management" />
      <div className="min-h-screen bg-slate-50">
        <ModernPageHeader
          title="Clients"
          subtitle="Manage your customer relationships and purchase history"
          stats={stats}
          actions={[
            {
              label: 'Add Client',
              icon: 'fas fa-user-plus',
              onClick: handleAddClient,
              variant: 'default'
            }
          ]}
        />
        
        <div className="p-6">
          <ModernDataTable
            data={(clientsData as any)?.clients || []}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search clients..."
            selectable={true}
            actions={actions}
            isLoading={clientsLoading}
            emptyState={{
              title: 'No clients yet',
              description: 'Start building your customer base by adding your first client.',
              icon: 'fas fa-users',
              action: {
                label: 'Add First Client',
                onClick: handleAddClient
              }
            }}
          />
        </div>
      </div>
    </>
  );
}