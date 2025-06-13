import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScreenSize } from "@/hooks/use-mobile";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface TableAction {
  label: string;
  icon?: string;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  condition?: (item: any) => boolean;
}

interface ModernDataTableProps {
  data: any[];
  columns: TableColumn[];
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  filterOptions?: Array<{ value: string; label: string }>;
  selectable?: boolean;
  actions?: TableAction[];
  bulkActions?: Array<{
    label: string;
    icon?: string;
    onClick: (selectedItems: any[]) => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyState?: {
    title: string;
    description: string;
    icon?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
}

export default function ModernDataTable({
  data,
  columns,
  title,
  subtitle,
  searchable = true,
  searchPlaceholder = "Search...",
  filterable = false,
  filterOptions = [],
  selectable = false,
  actions = [],
  bulkActions = [],
  pagination,
  isLoading = false,
  emptyState
}: ModernDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<any>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const screenSize = useScreenSize();

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(data.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: any, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Filter and search data
  const filteredData = data.filter(item => {
    const matchesSearch = !searchable || !searchTerm || 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = !filterable || filterValue === "all" || 
      String(item.category || '').toLowerCase() === filterValue.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <Card className="p-12">
        <div className="text-center">
          {emptyState.icon && (
            <i className={`${emptyState.icon} text-4xl text-slate-400 mb-4`}></i>
          )}
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{emptyState.title}</h3>
          <p className="text-slate-600 mb-6">{emptyState.description}</p>
          {emptyState.action && (
            <Button onClick={emptyState.action.onClick}>
              {emptyState.action.label}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      {(title || searchable || filterable || bulkActions.length > 0) && (
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            {title && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              {searchable && (
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <Input
                    placeholder={searchPlaceholder}
                    className="pl-10 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
              
              {filterable && filterOptions.length > 0 && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && bulkActions.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                {bulkActions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant || 'outline'}
                    onClick={() => action.onClick(Array.from(selectedItems))}
                    className="flex items-center gap-1"
                  >
                    {action.icon && <i className={action.icon}></i>}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="w-12 px-6 py-4">
                  <Checkbox
                    checked={selectedItems.size === data.length && data.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm font-semibold text-slate-900 ${
                    column.sortable ? 'cursor-pointer hover:bg-slate-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <i className={`fas fa-sort text-slate-400 ${
                        sortConfig?.key === column.key 
                          ? sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                          : ''
                      }`}></i>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="w-32 px-6 py-4 text-right text-sm font-semibold text-slate-900">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                {selectable && (
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-slate-900">
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {actions.map((action, actionIndex) => {
                        if (action.condition && !action.condition(item)) return null;
                        return (
                          <Button
                            key={actionIndex}
                            size="sm"
                            variant={action.variant || 'ghost'}
                            onClick={() => action.onClick(item)}
                            className="flex items-center gap-1"
                          >
                            {action.icon && <i className={action.icon}></i>}
                            {screenSize !== 'mobile' && action.label}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} items
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <i className="fas fa-angle-double-left"></i>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-angle-double-right"></i>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}