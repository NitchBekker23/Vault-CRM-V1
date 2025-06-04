import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddItemModal from "./add-item-modal";

export default function QuickActions() {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddItem = () => {
    setShowAddModal(true);
  };

  const handleBulkUpload = () => {
    window.location.href = "/bulk-upload";
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    alert("Report generation feature will be implemented");
  };

  const handleViewWishlist = () => {
    window.location.href = "/wishlist";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button 
              className="flex flex-col items-center p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
              onClick={handleAddItem}
            >
              <i className="fas fa-plus text-2xl text-slate-400 mb-2"></i>
              <span className="text-sm font-medium text-slate-600">Add Item</span>
            </button>
            
            <button 
              className="flex flex-col items-center p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
              onClick={handleBulkUpload}
            >
              <i className="fas fa-upload text-2xl text-slate-400 mb-2"></i>
              <span className="text-sm font-medium text-slate-600">Bulk Upload</span>
            </button>
            
            <button 
              className="flex flex-col items-center p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
              onClick={handleGenerateReport}
            >
              <i className="fas fa-file-download text-2xl text-slate-400 mb-2"></i>
              <span className="text-sm font-medium text-slate-600">Export Report</span>
            </button>
            
            <button 
              className="flex flex-col items-center p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
              onClick={handleViewWishlist}
            >
              <i className="fas fa-search text-2xl text-slate-400 mb-2"></i>
              <span className="text-sm font-medium text-slate-600">View Demands</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <AddItemModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </>
  );
}
