
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Search, ListPlus, Microsoft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BulkUpdateDialog } from "./BulkUpdateDialog";
import { FilterPopover } from "./FilterPopover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function HiresTable() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHires, setSelectedHires] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // New states for column filters
  const [filters, setFilters] = useState({
    name: "",
    title: "",
    department: "",
    email: "",
    status: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHires();
  }, []);
  
  useEffect(() => {
    // Clear selections when filters change
    setSelectedHires([]);
  }, [searchQuery, filters]);

  const fetchHires = async () => {
    try {
      setIsLoading(true);
      const data = await hiresApi.getAll();
      setHires(data);
    } catch (error) {
      console.error("Error fetching hires:", error);
      toast({
        title: "Error",
        description: "Failed to fetch new hires data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await hiresApi.delete(id);
        toast({
          title: "Success",
          description: "Record deleted successfully",
        });
        fetchHires();
        setSelectedHires(prev => prev.filter(hireId => hireId !== id));
      } catch (error) {
        console.error("Error deleting hire:", error);
        toast({
          title: "Error",
          description: "Failed to delete record",
          variant: "destructive",
        });
      }
    }
  };
  
  const isSelected = (id: string) => selectedHires.includes(id);

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedHires((prev) => [...prev, id]);
    } else {
      setSelectedHires((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHires(filteredHires.map((hire) => hire.id));
    } else {
      setSelectedHires([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedHires.length === 0) return;
    
    setIsBulkDeleting(true);
    try {
      await hiresApi.bulkDelete(selectedHires);
      toast({
        title: "Success",
        description: `${selectedHires.length} records deleted successfully`,
      });
      setSelectedHires([]);
      fetchHires();
    } catch (error) {
      console.error("Error bulk deleting hires:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected records",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  const handleBulkUpdate = async (updateData: Partial<NewHire>) => {
    if (selectedHires.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      await hiresApi.bulkUpdate(selectedHires, updateData);
      toast({
        title: "Success",
        description: `${selectedHires.length} records updated successfully`,
      });
      fetchHires();
    } catch (error) {
      console.error("Error bulk updating hires:", error);
      toast({
        title: "Error",
        description: "Failed to update selected records",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Helper to check if a filter is active for a specific column
  const isFilterActive = (column: keyof typeof filters) => {
    return filters[column] !== "";
  };

  // Helper to clear a specific column filter
  const clearFilter = (column: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [column]: "" }));
  };
  
  // Combined filtering logic for global search and column filters
  const filteredHires = hires.filter((hire) => {
    // Global search filtering
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" ||
      hire.name.toLowerCase().includes(searchLower) ||
      hire.email.toLowerCase().includes(searchLower) ||
      hire.department.toLowerCase().includes(searchLower) ||
      hire.title.toLowerCase().includes(searchLower);
      
    // Column-specific filtering
    const matchesName = filters.name === "" || 
      hire.name.toLowerCase().includes(filters.name.toLowerCase());
    const matchesTitle = filters.title === "" || 
      hire.title.toLowerCase().includes(filters.title.toLowerCase());
    const matchesDepartment = filters.department === "" || 
      hire.department.toLowerCase().includes(filters.department.toLowerCase());
    const matchesEmail = filters.email === "" || 
      hire.email.toLowerCase().includes(filters.email.toLowerCase());
    const matchesStatus = filters.status === "" || 
      hire.account_creation_status === filters.status;
    
    return matchesSearch && matchesName && matchesTitle && 
           matchesDepartment && matchesEmail && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          {selectedHires.length > 0 && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setShowBulkUpdateDialog(true)}
                disabled={isBulkUpdating}
              >
                <ListPlus className="h-4 w-4 mr-1" />
                Bulk Update ({selectedHires.length})
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBulkDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected ({selectedHires.length})
              </Button>
            </>
          )}
          <Button onClick={() => navigate("/hires/new")}>Add New Hire</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredHires.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || Object.values(filters).some(f => f !== "") 
            ? "No matching records found" 
            : "No records available. Import or add new hires."}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={filteredHires.length > 0 && selectedHires.length === filteredHires.length} 
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Name
                    <FilterPopover 
                      isActive={isFilterActive("name")}
                      onClear={() => clearFilter("name")}
                    >
                      <Label className="text-xs">Filter by name</Label>
                      <Input
                        placeholder="Type to filter..."
                        value={filters.name}
                        onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                        className="h-8 mt-1"
                      />
                    </FilterPopover>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Title
                    <FilterPopover 
                      isActive={isFilterActive("title")}
                      onClear={() => clearFilter("title")}
                    >
                      <Label className="text-xs">Filter by title</Label>
                      <Input
                        placeholder="Type to filter..."
                        value={filters.title}
                        onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                        className="h-8 mt-1"
                      />
                    </FilterPopover>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Department
                    <FilterPopover 
                      isActive={isFilterActive("department")}
                      onClear={() => clearFilter("department")}
                    >
                      <Label className="text-xs">Filter by department</Label>
                      <Input
                        placeholder="Type to filter..."
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="h-8 mt-1"
                      />
                    </FilterPopover>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Email
                    <FilterPopover 
                      isActive={isFilterActive("email")}
                      onClear={() => clearFilter("email")}
                    >
                      <Label className="text-xs">Filter by email</Label>
                      <Input
                        placeholder="Type to filter..."
                        value={filters.email}
                        onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                        className="h-8 mt-1"
                      />
                    </FilterPopover>
                  </div>
                </TableHead>
                <TableHead>Onsite Date</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <Microsoft className="h-3 w-3 mr-1" /> 
                    License
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Status
                    <FilterPopover 
                      isActive={isFilterActive("status")}
                      onClear={() => clearFilter("status")}
                    >
                      <Label className="text-xs mb-2">Select status</Label>
                      <RadioGroup 
                        value={filters.status} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Active" id="active" />
                          <Label htmlFor="active" className="text-sm">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Pending" id="pending" />
                          <Label htmlFor="pending" className="text-sm">Pending</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Inactive" id="inactive" />
                          <Label htmlFor="inactive" className="text-sm">Inactive</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Suspended" id="suspended" />
                          <Label htmlFor="suspended" className="text-sm">Suspended</Label>
                        </div>
                      </RadioGroup>
                    </FilterPopover>
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHires.map((hire) => (
                <TableRow key={hire.id}>
                  <TableCell>
                    <Checkbox 
                      checked={isSelected(hire.id)}
                      onCheckedChange={(checked) => handleSelectOne(hire.id, checked === true)}
                      aria-label={`Select ${hire.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{hire.name}</TableCell>
                  <TableCell>{hire.title}</TableCell>
                  <TableCell>{hire.department}</TableCell>
                  <TableCell>{hire.email}</TableCell>
                  <TableCell>{new Date(hire.on_site_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hire.microsoft_365_license && hire.microsoft_365_license !== "None" ? 
                        "bg-green-100 text-green-800" : 
                        "bg-gray-100 text-gray-800"
                    }`}>
                      {hire.microsoft_365_license || "None"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hire.account_creation_status === "Active" ? 
                        "bg-green-100 text-green-800" : 
                        hire.account_creation_status === "Pending" ?
                          "bg-yellow-100 text-yellow-800" :
                          hire.account_creation_status === "Inactive" ?
                            "bg-gray-100 text-gray-800" :
                            "bg-red-100 text-red-800"
                    }`}>
                      {hire.account_creation_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/hires/${hire.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(hire.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {selectedHires.length} selected records
              and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <BulkUpdateDialog 
        isOpen={showBulkUpdateDialog}
        onClose={() => setShowBulkUpdateDialog(false)}
        onUpdate={handleBulkUpdate}
        selectedCount={selectedHires.length}
      />
    </div>
  );
}
