import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { hiresApi } from "@/services/api";
import { NewHire, SortDirection, SortField } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Search, ListPlus, Laptop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BulkUpdateDialog } from "./BulkUpdateDialog";
import { FilterPopover } from "./FilterPopover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { licenseService } from "@/services/license-service";
import { SortButton } from "./SortButton";
import { ExcelReportDialog } from "./ExcelReportDialog";
import { calculateProgressPercentage } from "@/utils/progressCalculator";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useResponsive } from "@/hooks/use-responsive";
import { HireDetailModal } from "./HireDetailModal";

export function HiresTable() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHires, setSelectedHires] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [showExcelReportDialog, setShowExcelReportDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [licenseTypes, setLicenseTypes] = useState<string[]>([]);
  // Add state for detail modal
  const [selectedHireId, setSelectedHireId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Add sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  // Column filters state
  const [filters, setFilters] = useState({
    name: "",
    title: "",
    department: "",
    email: "",
    progress: "", // Changed from status to progress
    license: "", 
    ictSupportPic: "", // Added ICT Support PIC filter
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  useEffect(() => {
    fetchHires();
    fetchLicenseTypes();
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

  const fetchLicenseTypes = async () => {
    try {
      const data = await licenseService.getLicenseTypes();
      // Extract just the names for the filter
      const licenseNames = data.map(license => license.name);
      // Add "None" option for users without a license
      setLicenseTypes(["None", ...licenseNames]);
    } catch (error) {
      console.error("Error fetching license types:", error);
      // Fallback to basic options if API fails
      setLicenseTypes(["None", "E3", "E5", "F3"]);
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

  // Add new handlers for row click
  const handleRowClick = (hireId: string, event: React.MouseEvent) => {
    // Prevent row click when clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="checkbox"]') || 
      target.closest('input[type="checkbox"]')
    ) {
      return;
    }
    
    setSelectedHireId(hireId);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedHireId(null);
  };

  // Helper to check if a filter is active for a specific column
  const isFilterActive = (column: keyof typeof filters) => {
    return filters[column] !== "";
  };

  // Helper to clear a specific column filter
  const clearFilter = (column: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [column]: "" }));
  };
  
  // New function to handle sorting
  const handleSort = (field: string) => {
    let newDirection: SortDirection = "asc";
    
    // If already sorting by this field, toggle direction or clear sort
    if (sortField === field) {
      if (sortDirection === "asc") {
        newDirection = "desc";
      } else if (sortDirection === "desc") {
        // Reset sort
        setSortField(null);
        setSortDirection(null);
        return;
      }
    }
    
    setSortField(field);
    setSortDirection(newDirection);
  };
  
  // Get sort direction for a column (for display in UI)
  const getSortDirectionForField = (field: string): SortDirection => {
    return sortField === field ? sortDirection : null;
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
    
    // Enhanced progress filter - check both percentage ranges and status-based filters
    const hireProgress = calculateProgressPercentage(hire);
    const matchesProgress = filters.progress === "" || 
      // Status-based filters
      (filters.progress === "not-started" && hireProgress === 0) ||
      (filters.progress === "in-progress" && hireProgress > 0 && hireProgress < 100) ||
      (filters.progress === "completed" && hireProgress === 100) ||
      (filters.progress === "at-risk" && hireProgress < 50) ||
      (filters.progress === "nearly-done" && hireProgress >= 75) ||
      // Existing percentage range filters
      (filters.progress === "0-25" && hireProgress >= 0 && hireProgress <= 25) ||
      (filters.progress === "26-50" && hireProgress >= 26 && hireProgress <= 50) ||
      (filters.progress === "51-75" && hireProgress >= 51 && hireProgress <= 75) ||
      (filters.progress === "76-100" && hireProgress >= 76 && hireProgress <= 100);
    
    // License filter
    const licenseLower = filters.license.toLowerCase();
    const hireLicense = (hire.microsoft_365_license || "None").toLowerCase();
    const matchesLicense = filters.license === "" || 
      hireLicense === licenseLower ||
      (licenseLower === "none" && (!hire.microsoft_365_license || hire.microsoft_365_license === ""));
    
    // ICT Support PIC filter
    const ictSupportPicLower = filters.ictSupportPic.toLowerCase();
    const hireIctSupportPic = (hire.ict_support_pic || "").toLowerCase();
    const matchesIctSupportPic = filters.ictSupportPic === "" ||
      hireIctSupportPic.includes(ictSupportPicLower);
    
    return matchesSearch && matchesName && matchesTitle && 
           matchesDepartment && matchesEmail && matchesProgress && 
           matchesLicense && matchesIctSupportPic;
  });

  // Apply sorting to filtered data
  const sortedHires = [...filteredHires].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    
    let valueA = a[sortField];
    let valueB = b[sortField];
    
    // Special handling for progress percentage
    if (sortField === "progress_percentage") {
      valueA = calculateProgressPercentage(a);
      valueB = calculateProgressPercentage(b);
    }
    // Special handling for dates
    else if (sortField === "on_site_date" || sortField === "created_at" || sortField === "updated_at") {
      valueA = new Date(valueA || 0).getTime();
      valueB = new Date(valueB || 0).getTime();
    } 
    // Special handling for license (consider "None" as empty string for sorting)
    else if (sortField === "microsoft_365_license") {
      valueA = valueA || "";
      valueB = valueB || "";
    }
    // String comparison for other fields
    else if (typeof valueA === "string" && typeof valueB === "string") {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    // Compare values based on sort direction
    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Get selected hire details (complete objects not just IDs)
  const getSelectedHireDetails = (): NewHire[] => {
    return hires.filter(hire => selectedHires.includes(hire.id));
  };

  // Handler for showing Excel report dialog
  const handleShowExcelReport = () => {
    setShowExcelReportDialog(true);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-shrink-0 flex justify-between items-center p-4 bg-white border-b">
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
                size={isMobile ? "sm" : "default"}
              >
                <ListPlus className="h-4 w-4 mr-1" />
                {isMobile ? "Update" : `Bulk Update (${selectedHires.length})`}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBulkDeleting}
                size={isMobile ? "sm" : "default"}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {isMobile ? "Delete" : `Delete Selected (${selectedHires.length})`}
              </Button>
            </>
          )}
          <Button onClick={() => navigate("/hires/new")} size={isMobile ? "sm" : "default"}>
            {isMobile ? "Add" : "Add New Hire"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : sortedHires.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || Object.values(filters).some(f => f !== "") 
            ? "No matching records found" 
            : "No records available. Import or add new hires."}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden flex-1 flex flex-col min-h-0">
          <ScrollArea className="w-full flex-1 min-h-0" showHorizontalScrollbar>
            <div className={`${isMobile ? 'min-w-[600px]' : isTablet ? 'min-w-[900px]' : 'min-w-[1200px]'} relative`}>
              <Table>
                <TableHeader sticky>
                  <TableRow>
                    <TableHead className="w-[50px] bg-background">
                      <Checkbox 
                        checked={sortedHires.length > 0 && selectedHires.length === sortedHires.length} 
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px] bg-background">
                      <div className="flex items-center space-x-1">
                        Name
                        <SortButton 
                          direction={getSortDirectionForField("name")}
                          onClick={() => handleSort("name")}
                        />
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
                    {/* Title - Desktop only */}
                    {isDesktop && (
                      <TableHead className="min-w-[150px] bg-background">
                        <div className="flex items-center space-x-1">
                          Title
                          <SortButton 
                            direction={getSortDirectionForField("title")}
                            onClick={() => handleSort("title")}
                          />
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
                    )}
                    {/* Department - Tablet+ */}
                    {!isMobile && (
                      <TableHead className="min-w-[150px] bg-background">
                        <div className="flex items-center space-x-1">
                          Department
                          <SortButton 
                            direction={getSortDirectionForField("department")}
                            onClick={() => handleSort("department")}
                          />
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
                    )}
                    {/* Email - Tablet+ */}
                    {!isMobile && (
                      <TableHead className="min-w-[200px] bg-background">
                        <div className="flex items-center space-x-1">
                          Email
                          <SortButton 
                            direction={getSortDirectionForField("email")}
                            onClick={() => handleSort("email")}
                          />
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
                    )}
                    {/* Onsite Date - Desktop only */}
                    {isDesktop && (
                      <TableHead className="min-w-[120px] bg-background">
                        <div className="flex items-center space-x-1">
                          Onsite Date
                          <SortButton 
                            direction={getSortDirectionForField("on_site_date")}
                            onClick={() => handleSort("on_site_date")}
                          />
                        </div>
                      </TableHead>
                    )}
                    {/* License - Desktop only */}
                    {isDesktop && (
                      <TableHead className="min-w-[120px] bg-background">
                        <div className="flex items-center space-x-1">
                          <Laptop className="h-3 w-3 mr-1" /> 
                          License
                          <SortButton 
                            direction={getSortDirectionForField("microsoft_365_license")}
                            onClick={() => handleSort("microsoft_365_license")}
                          />
                          <FilterPopover 
                            isActive={isFilterActive("license")}
                            onClear={() => clearFilter("license")}
                          >
                            <Label className="text-xs mb-2">Select license type</Label>
                            <RadioGroup 
                              value={filters.license} 
                              onValueChange={(value) => setFilters(prev => ({ ...prev, license: value }))}
                            >
                              {licenseTypes.map((license) => (
                                <div key={license} className="flex items-center space-x-2">
                                  <RadioGroupItem value={license} id={`license-${license.toLowerCase()}`} />
                                  <Label htmlFor={`license-${license.toLowerCase()}`} className="text-sm">{license}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FilterPopover>
                        </div>
                      </TableHead>
                    )}
                    {/* ICT Support PIC - Desktop only */}
                    {isDesktop && (
                      <TableHead className="min-w-[120px] bg-background">
                        <div className="flex items-center space-x-1">
                          ICT Support PIC
                          <SortButton 
                            direction={getSortDirectionForField("ict_support_pic")}
                            onClick={() => handleSort("ict_support_pic")}
                          />
                          <FilterPopover 
                            isActive={isFilterActive("ictSupportPic")}
                            onClear={() => clearFilter("ictSupportPic")}
                          >
                            <Label className="text-xs">Filter by ICT Support</Label>
                            <Input
                              placeholder="Type to filter..."
                              value={filters.ictSupportPic}
                              onChange={(e) => setFilters(prev => ({ ...prev, ictSupportPic: e.target.value }))}
                              className="h-8 mt-1"
                            />
                          </FilterPopover>
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="min-w-[150px] bg-background">
                      <div className="flex items-center space-x-1">
                        Progress
                        <SortButton 
                          direction={getSortDirectionForField("progress_percentage")}
                          onClick={() => handleSort("progress_percentage")}
                        />
                        <FilterPopover 
                          isActive={isFilterActive("progress")}
                          onClear={() => clearFilter("progress")}
                        >
                          <Label className="text-xs mb-2">Filter by progress status</Label>
                          <RadioGroup 
                            value={filters.progress} 
                            onValueChange={(value) => setFilters(prev => ({ ...prev, progress: value }))}
                          >
                            {/* Status-based filters */}
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="not-started" id="progress-not-started" />
                              <Label htmlFor="progress-not-started" className="text-sm">Not Started (0%)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="in-progress" id="progress-in-progress" />
                              <Label htmlFor="progress-in-progress" className="text-sm">In Progress (1-99%)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="completed" id="progress-completed" />
                              <Label htmlFor="progress-completed" className="text-sm">Completed (100%)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="at-risk" id="progress-at-risk" />
                              <Label htmlFor="progress-at-risk" className="text-sm">At Risk (&lt;50%)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nearly-done" id="progress-nearly-done" />
                              <Label htmlFor="progress-nearly-done" className="text-sm">Nearly Done (≥75%)</Label>
                            </div>
                            
                            {/* Separator */}
                            <div className="border-t my-2"></div>
                            <Label className="text-xs text-muted-foreground">Detailed Ranges:</Label>
                            
                            {/* Existing percentage range filters */}
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="0-25" id="progress-0-25" />
                              <Label htmlFor="progress-0-25" className="text-sm">0-25%</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="26-50" id="progress-26-50" />
                              <Label htmlFor="progress-26-50" className="text-sm">26-50%</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="51-75" id="progress-51-75" />
                              <Label htmlFor="progress-51-75" className="text-sm">51-75%</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="76-100" id="progress-76-100" />
                              <Label htmlFor="progress-76-100" className="text-sm">76-100%</Label>
                            </div>
                          </RadioGroup>
                        </FilterPopover>
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHires.map((hire) => {
                    const progressPercentage = calculateProgressPercentage(hire);
                    
                    return (
                      <TableRow 
                        key={hire.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => handleRowClick(hire.id, e)}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={isSelected(hire.id)}
                            onCheckedChange={(checked) => handleSelectOne(hire.id, checked === true)}
                            aria-label={`Select ${hire.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {hire.name}
                            {/* Show additional info on mobile */}
                            {isMobile && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {hire.department} • {hire.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Title - Desktop only */}
                        {isDesktop && <TableCell>{hire.title}</TableCell>}
                        {/* Department - Tablet+ */}
                        {!isMobile && <TableCell>{hire.department}</TableCell>}
                        {/* Email - Tablet+ */}
                        {!isMobile && <TableCell>{hire.email}</TableCell>}
                        {/* Onsite Date - Desktop only */}
                        {isDesktop && <TableCell>{hire.on_site_date ? new Date(hire.on_site_date).toLocaleDateString() : 'N/A'}</TableCell>}
                        {/* License - Desktop only */}
                        {isDesktop && (
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              hire.microsoft_365_license && hire.microsoft_365_license !== "None" ? 
                                "bg-green-100 text-green-800" : 
                                "bg-gray-100 text-gray-800"
                            }`}>
                              {hire.microsoft_365_license || "None"}
                            </span>
                          </TableCell>
                        )}
                        {/* ICT Support PIC - Desktop only */}
                        {isDesktop && <TableCell>{hire.ict_support_pic || "Unassigned"}</TableCell>}
                        <TableCell>
                          <ProgressBar 
                            percentage={progressPercentage} 
                            showText={!isMobile}
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size={isMobile ? "sm" : "icon"}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hires/${hire.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size={isMobile ? "sm" : "icon"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(hire.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" className="h-2.5" />
          </ScrollArea>
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
        onExcelReport={handleShowExcelReport}
        selectedHires={getSelectedHireDetails()}
      />
      
      <ExcelReportDialog
        isOpen={showExcelReportDialog}
        onClose={() => setShowExcelReportDialog(false)}
        selectedHires={getSelectedHireDetails()}
      />

      {/* Add the new detail modal */}
      <HireDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        hireId={selectedHireId}
      />
    </div>
  );
}
