import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import ModernPageHeader from "@/components/modern-page-header";
import ModernDataTable from "@/components/modern-data-table";
import ImportInventoryModal from "@/components/import-inventory-modal";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Inventory() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showImportModal, setShowImportModal] = useState(false);


  // Fetch inventory data
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
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

  const handleAddItem = () => {
    // Navigate to add item page or open modal
    console.log("Add new item");
  };

  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleEdit = (item: any) => {
    console.log("Edit item:", item.id);
  };

  const handleDelete = (item: any) => {
    console.log("Delete item:", item.id);
  };

  const handleBulkDelete = (selectedIds: any[]) => {
    console.log("Bulk delete:", selectedIds);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'in-stock': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'reserved': { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      'sold': { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['in-stock'];
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return `R ${price.toLocaleString()}`;
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, item: any) => (
        <div>
          <div className="font-medium text-slate-900">{value}</div>
          {item.brand && <div className="text-sm text-slate-500">{item.brand}</div>}
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (value: string) => (
        <code className="px-2 py-1 bg-slate-100 rounded text-sm">{value || '-'}</code>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value: number) => formatPrice(value)
    },
    {
      key: 'createdAt',
      label: 'Added',
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

  const bulkActions = [
    {
      label: 'Delete Selected',
      icon: 'fas fa-trash',
      onClick: handleBulkDelete,
      variant: 'destructive' as const
    }
  ];

  const stats = [
    {
      label: 'Total Items',
      value: (metrics as any)?.totalInventory || 0,
      change: '+12%',
      trend: 'up' as const
    },
    {
      label: 'In Stock',
      value: (metrics as any)?.inStock || 0,
      change: '+5%',
      trend: 'up' as const
    },
    {
      label: 'Reserved',
      value: (metrics as any)?.reserved || 0,
      change: '-2%',
      trend: 'down' as const
    },
    {
      label: 'Value',
      value: 'R 2.4M',
      change: '+8%',
      trend: 'up' as const
    }
  ];

  return (
    <>
      <Header title="Inventory Management" />
      <div className="min-h-screen bg-slate-50">
        <ModernPageHeader
          title="Inventory"
          subtitle="Manage your watch and leather goods collection"
          stats={stats}
          actions={[
            {
              label: 'Import Items',
              icon: 'fas fa-upload',
              onClick: handleImport,
              variant: 'outline'
            },
            {
              label: 'Add Item',
              icon: 'fas fa-plus',
              onClick: handleAddItem,
              variant: 'default'
            }
          ]}
        />
        
        <div className="p-6">
          <ModernDataTable
            data={(inventoryData as any)?.items || []}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search inventory..."
            filterable={true}
            filterOptions={[
              { value: 'Watches', label: 'Watches' },
              { value: 'Leather Goods', label: 'Leather Goods' },
              { value: 'Accessories', label: 'Accessories' }
            ]}
            selectable={true}
            actions={actions}
            bulkActions={bulkActions}
            isLoading={inventoryLoading}
            emptyState={{
              title: 'No inventory items',
              description: 'Get started by adding your first item to the inventory.',
              icon: 'fas fa-box-open',
              action: {
                label: 'Add First Item',
                onClick: handleAddItem
              }
            }}
          />
        </div>
      </div>

      <ImportInventoryModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />
    </>
  );
}
