import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import AddItemModal from "./add-item-modal";

export default function QuickActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const isMobile = useIsMobile();

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
      <Card className={isMobile ? 'w-full' : ''}>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-lg' : ''}>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 gap-4'}`}>
            <button 
              className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-4'} border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors`}
              onClick={handleAddItem}
            >
              <i className={`fas fa-plus ${isMobile ? 'text-xl' : 'text-2xl'} text-slate-400 mb-2`}></i>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600 text-center`}>Add Item</span>
            </button>
            
            <button 
              className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-4'} border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors`}
              onClick={handleBulkUpload}
            >
              <i className={`fas fa-upload ${isMobile ? 'text-xl' : 'text-2xl'} text-slate-400 mb-2`}></i>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600 text-center`}>Bulk Upload</span>
            </button>
            
            <button 
              className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-4'} border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors`}
              onClick={handleGenerateReport}
            >
              <i className={`fas fa-file-download ${isMobile ? 'text-xl' : 'text-2xl'} text-slate-400 mb-2`}></i>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600 text-center`}>Export Report</span>
            </button>
            
            <button 
              className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-4'} border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors`}
              onClick={handleViewWishlist}
            >
              <i className={`fas fa-search ${isMobile ? 'text-xl' : 'text-2xl'} text-slate-400 mb-2`}></i>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600 text-center`}>View Demands</span>
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
