import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, Search } from "lucide-react";
import AddItemModal from "@/components/modals/add-item-modal";

export default function QuickActions() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const actions = [
    {
      title: "Add Item",
      icon: Plus,
      onClick: () => setIsAddModalOpen(true),
    },
    {
      title: "Bulk Upload",
      icon: Upload,
      onClick: () => window.location.href = "/admin/bulk-upload",
    },
    {
      title: "Export Report",
      icon: Download,
      onClick: () => {
        // TODO: Implement export functionality
        alert("Export functionality would be implemented here");
      },
    },
    {
      title: "View Demands",
      icon: Search,
      onClick: () => window.location.href = "/wishlist",
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                onClick={action.onClick}
              >
                <action.icon className="w-6 h-6 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddItemModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
      />
    </>
  );
}
