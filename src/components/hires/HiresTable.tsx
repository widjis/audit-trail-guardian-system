import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { hiresApi } from '@/services/api';
import { NewHire, SortDirection, SortField } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, ListPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BulkUpdateDialog } from './BulkUpdateDialog';
import { FilterPopover } from './FilterPopover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { licenseService } from '@/services/license-service';
import { SortButton } from './SortButton';
import { ExcelReportDialog } from './ExcelReportDialog';
import { calculateProgressPercentage } from '@/utils/progressCalculator';
import { ProgressBar } from '@/components/ui/progress-bar';
import { HireDetailModal } from './HireDetailModal';

export function HiresTable() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    name: '',
    title: '',
    department: '',
    email: '',
    progress: '', // Changed from status to progress
    license: '',
    ictSupportPic: '', // Added ICT Support PIC filter
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadError, setLoadError] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Clear selections when filters change
    setSelectedHires([]);
    setCurrentPage(1);
  }, [searchQuery, filters, accountFilter]);

  const loadRequest = useRef(0);
  const fetchHires = useCallback(async () => {
    const requestId = ++loadRequest.current;
    try {
      setIsLoading(true);
      setLoadError(false);
      const data = await hiresApi.getAll();
      if (requestId !== loadRequest.current) return;
      setHires(data);
      setSelectedHires((prev) =>
        prev.filter((id) => data.some((hire) => hire.id === id)),
      );
    } catch (error) {
      if (requestId !== loadRequest.current) return;
      setLoadError(true);
      console.error('Error fetching hires:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch new hires data',
        variant: 'destructive',
      });
    } finally {
      if (requestId === loadRequest.current) setIsLoading(false);
    }
  }, [toast]);

  const fetchLicenseTypes = useCallback(async () => {
    try {
      const data = await licenseService.getLicenseTypes();
      // Extract just the names for the filter
      const licenseNames = data.map((license) => license.name);
      // Add "None" option for users without a license
      setLicenseTypes(['None', ...licenseNames]);
    } catch (error) {
      console.error('Error fetching license types:', error);
      // Fallback to basic options if API fails
      setLicenseTypes(['None', 'E3', 'E5', 'F3']);
    }
  }, []);

  const invalidateLoad = useCallback(() => {
    loadRequest.current++;
  }, []);

  useEffect(() => {
    void fetchHires();
    void fetchLicenseTypes();
    return invalidateLoad;
  }, [fetchHires, fetchLicenseTypes, invalidateLoad]);

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmSingleDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await hiresApi.delete(pendingDeleteId);
      toast({ title: 'Success', description: 'Record deleted successfully' });
      setSelectedHires((prev) => prev.filter((id) => id !== pendingDeleteId));
      setShowDeleteDialog(false);
      setPendingDeleteId(null);
      await fetchHires();
    } catch (error) {
      console.error('Error deleting hire:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete record',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
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
        title: 'Success',
        description: `${selectedHires.length} records deleted successfully`,
      });
      setSelectedHires([]);
      fetchHires();
    } catch (error) {
      console.error('Error bulk deleting hires:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete selected records',
        variant: 'destructive',
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
        title: 'Success',
        description: `${selectedHires.length} records updated successfully`,
      });
      fetchHires();
    } catch (error) {
      console.error('Error bulk updating hires:', error);
      toast({
        title: 'Error',
        description: 'Failed to update selected records',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedHireId(null);
  };

  // Helper to check if a filter is active for a specific column
  const isFilterActive = (column: keyof typeof filters) => {
    return filters[column] !== '';
  };

  // Helper to clear a specific column filter
  const clearFilter = (column: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [column]: '' }));
  };

  // New function to handle sorting
  const handleSort = (field: string) => {
    let newDirection: SortDirection = 'asc';

    // If already sorting by this field, toggle direction or clear sort
    if (sortField === field) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
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
    const matchesSearch =
      searchQuery === '' ||
      hire.name.toLowerCase().includes(searchLower) ||
      hire.email.toLowerCase().includes(searchLower) ||
      hire.department.toLowerCase().includes(searchLower) ||
      hire.title.toLowerCase().includes(searchLower);

    // Column-specific filtering
    const matchesName =
      filters.name === '' ||
      hire.name.toLowerCase().includes(filters.name.toLowerCase());
    const matchesTitle =
      filters.title === '' ||
      hire.title.toLowerCase().includes(filters.title.toLowerCase());
    const matchesDepartment =
      filters.department === '' ||
      hire.department.toLowerCase().includes(filters.department.toLowerCase());
    const matchesEmail =
      filters.email === '' ||
      hire.email.toLowerCase().includes(filters.email.toLowerCase());

    // Enhanced progress filter - check both percentage ranges and status-based filters
    const hireProgress = calculateProgressPercentage(hire);
    const matchesProgress =
      filters.progress === '' ||
      // Status-based filters
      (filters.progress === 'not-started' && hireProgress === 0) ||
      (filters.progress === 'in-progress' &&
        hireProgress > 0 &&
        hireProgress < 100) ||
      (filters.progress === 'completed' && hireProgress === 100) ||
      (filters.progress === 'at-risk' && hireProgress < 50) ||
      (filters.progress === 'nearly-done' && hireProgress >= 75) ||
      // Existing percentage range filters
      (filters.progress === '0-25' &&
        hireProgress >= 0 &&
        hireProgress <= 25) ||
      (filters.progress === '26-50' &&
        hireProgress >= 26 &&
        hireProgress <= 50) ||
      (filters.progress === '51-75' &&
        hireProgress >= 51 &&
        hireProgress <= 75) ||
      (filters.progress === '76-100' &&
        hireProgress >= 76 &&
        hireProgress <= 100);

    // License filter
    const licenseLower = filters.license.toLowerCase();
    const hireLicense = (hire.microsoft_365_license || 'None').toLowerCase();
    const matchesLicense =
      filters.license === '' ||
      hireLicense === licenseLower ||
      (licenseLower === 'none' &&
        (!hire.microsoft_365_license || hire.microsoft_365_license === ''));

    // ICT Support PIC filter
    const ictSupportPicLower = filters.ictSupportPic.toLowerCase();
    const hireIctSupportPic = (hire.ict_support_pic || '').toLowerCase();
    const matchesIctSupportPic =
      filters.ictSupportPic === '' ||
      hireIctSupportPic.includes(ictSupportPicLower);

    return (
      (!accountFilter || hire.account_creation_status === accountFilter) &&
      matchesSearch &&
      matchesName &&
      matchesTitle &&
      matchesDepartment &&
      matchesEmail &&
      matchesProgress &&
      matchesLicense &&
      matchesIctSupportPic
    );
  });

  // Apply sorting to filtered data
  const sortedHires = [...filteredHires].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let valueA = a[sortField];
    let valueB = b[sortField];

    // Special handling for progress percentage
    if (sortField === 'progress_percentage') {
      valueA = calculateProgressPercentage(a);
      valueB = calculateProgressPercentage(b);
    }
    // Special handling for dates
    else if (
      sortField === 'on_site_date' ||
      sortField === 'created_at' ||
      sortField === 'updated_at'
    ) {
      valueA = new Date(valueA || 0).getTime();
      valueB = new Date(valueB || 0).getTime();
    }
    // Special handling for license (consider "None" as empty string for sorting)
    else if (sortField === 'microsoft_365_license') {
      valueA = valueA || '';
      valueB = valueB || '';
    }
    // String comparison for other fields
    else if (typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    // Compare values based on sort direction
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get selected hire details (complete objects not just IDs)
  const getSelectedHireDetails = (): NewHire[] => {
    return hires.filter((hire) => selectedHires.includes(hire.id));
  };

  // Handler for showing Excel report dialog
  const handleShowExcelReport = () => {
    setShowExcelReportDialog(true);
  };

  const departments = [
    ...new Set(hires.map((hire) => hire.department).filter(Boolean)),
  ].sort();
  const columns: {
    field: string;
    label: string;
    filter?: keyof typeof filters;
  }[] = [
    { field: 'name', label: 'New Hire', filter: 'name' },
    { field: 'title', label: 'Job Title', filter: 'title' },
    { field: 'department', label: 'Department', filter: 'department' },
    { field: 'email', label: 'Email', filter: 'email' },
    { field: 'on_site_date', label: 'On-site Date' },
    { field: 'status_srf', label: 'SRF' },
    { field: 'laptop_ready', label: 'Laptop' },
    { field: 'account_creation_status', label: 'AD Account' },
    { field: 'microsoft_365_license', label: 'License', filter: 'license' },
    {
      field: 'ict_support_pic',
      label: 'ICT Support PIC',
      filter: 'ictSupportPic',
    },
    { field: 'progress_percentage', label: 'Progress', filter: 'progress' },
  ];
  const pageCount = Math.max(1, Math.ceil(sortedHires.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const pageHires = sortedHires.slice((page - 1) * pageSize, page * pageSize);
  const busy = isBulkDeleting || isBulkUpdating || isDeleting;
  const clearFilters = () => {
    setSearchQuery('');
    setAccountFilter('');
    setFilters({
      name: '',
      title: '',
      department: '',
      email: '',
      progress: '',
      license: '',
      ictSupportPic: '',
    });
  };
  const exportCsv = () => {
    const fields = [
      'name',
      'title',
      'department',
      'email',
      'on_site_date',
      'account_creation_status',
      'laptop_ready',
      'microsoft_365_license',
      'ict_support_pic',
    ] as const;
    const quote = (value: unknown) =>
      `"${String(value ?? '')
        .replace(/^(\s*[=+\-@])/, "'$1")
        .replace(/"/g, '""')}"`;
    const csv =
      '\uFEFF' +
      [
        fields.map(quote).join(','),
        ...sortedHires.map((hire) =>
          fields.map((field) => quote(hire[field])).join(','),
        ),
      ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'new-hires.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const textFilters = ['name', 'title', 'department', 'email', 'ictSupportPic'];
  const progressOptions = [
    ['not-started', 'Not Started (0%)'],
    ['in-progress', 'In Progress (1–99%)'],
    ['completed', 'Completed (100%)'],
    ['at-risk', 'At Risk (<50%)'],
    ['nearly-done', 'Nearly Done (≥75%)'],
    ['0-25', '0–25%'],
    ['26-50', '26–50%'],
    ['51-75', '51–75%'],
    ['76-100', '76–100%'],
  ];

  return (
    <div className="merdeka-hires-table">
      <div className="employee-toolbar">
        <div className="input-icon employee-search">
          <span className="input-icon-addon">
            <i className="ti ti-search" aria-hidden="true" />
          </span>
          <input
            className="form-control"
            type="search"
            aria-label="Search new hires"
            placeholder="Search name, email or department…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            disabled={busy}
          />
          {searchQuery && (
            <button
              className="employee-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
        <select
          className="form-select"
          aria-label="Filter department"
          value={filters.department}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, department: event.target.value }))
          }
          disabled={busy}
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department}>{department}</option>
          ))}
        </select>
        <div className="employee-toolbar-actions">
          <button
            className="btn btn-outline-gray"
            onClick={() => void fetchHires()}
            disabled={busy || isLoading}
            aria-label="Refresh new hires"
          >
            <i
              className={`ti ti-refresh${isLoading ? ' animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
          <button
            className="btn btn-outline-gray"
            onClick={exportCsv}
            disabled={!sortedHires.length || isLoading || loadError}
          >
            <i className="ti ti-download" aria-hidden="true" />
            Export CSV
          </button>
          <button
            className="btn mdka-btn-blue-600 text-white"
            onClick={() => navigate('/hires/new')}
          >
            <span>Add New Hire</span>
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="employee-tabs"
        role="group"
        aria-label="Filter by account status"
      >
        {[
          { value: '', label: 'All New Hires', count: hires.length },
          {
            value: 'Pending',
            label: 'Pending Account',
            count: hires.filter(
              (hire) => hire.account_creation_status === 'Pending',
            ).length,
          },
          {
            value: 'Active',
            label: 'Account Active',
            count: hires.filter(
              (hire) => hire.account_creation_status === 'Active',
            ).length,
          },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`employee-tab${accountFilter === tab.value ? ' active' : ''}`}
            aria-pressed={accountFilter === tab.value}
            onClick={() => setAccountFilter(tab.value)}
            disabled={busy}
          >
            {tab.label}
            <span className="badge">{tab.count}</span>
          </button>
        ))}
      </div>
      {selectedHires.length > 0 && (
        <div
          className="merdeka-selection-bar merdeka-legacy"
          role="region"
          aria-label="Selected hires actions"
        >
          <span>{selectedHires.length} selected across all pages</span>
          <Button
            variant="outline"
            onClick={() => setShowBulkUpdateDialog(true)}
            disabled={busy}
          >
            <ListPlus className="h-4 w-4 mr-1" />
            Bulk Update ({selectedHires.length})
          </Button>
          <Button
            variant="outline"
            onClick={handleShowExcelReport}
            disabled={busy}
          >
            Excel Report
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setPendingDeleteId(null);
              setShowDeleteDialog(true);
            }}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected ({selectedHires.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSelectedHires([])}
            disabled={busy}
          >
            Clear selection
          </Button>
        </div>
      )}
      {loadError ? (
        <div className="merdeka-table-message" role="alert">
          <strong>Unable to load new hires</strong>
          <p>
            Your records have not been changed. Check your connection and try
            again.
          </p>
          <button
            className="btn btn-outline-gray"
            onClick={() => void fetchHires()}
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="merdeka-table-message" role="status">
          Loading new hires…
        </div>
      ) : sortedHires.length === 0 ? (
        <div className="merdeka-table-message" role="status">
          <i className="ti ti-users" aria-hidden="true" />
          <strong>
            {hires.length ? 'No matching records found' : 'No new hires yet'}
          </strong>
          <p>
            {hires.length
              ? 'Try another search or clear your filters.'
              : 'Import data or add a new hire to get started.'}
          </p>
          {hires.length ? (
            <button className="btn btn-outline-gray" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <button
              className="btn btn-outline-gray"
              onClick={() => navigate('/import')}
            >
              Import Data
            </button>
          )}
        </div>
      ) : (
        <div
          className="employee-table-surface"
          role="region"
          aria-label="New hires table, scroll horizontally for more columns"
          tabIndex={0}
        >
          <Table className="table table-vcenter employee-table">
            <TableHeader>
              <TableRow>
                <TableHead className="merdeka-checkbox-cell">
                  <Checkbox
                    className="merdeka-legacy"
                    checked={
                      sortedHires.length > 0 &&
                      selectedHires.length === sortedHires.length
                        ? true
                        : selectedHires.length > 0
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                    aria-label="Select all matching records across all pages"
                    disabled={busy}
                  />
                </TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={column.field}
                    aria-sort={
                      sortField === column.field
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <div className="merdeka-column-heading">
                      {column.label}
                      <SortButton
                        className="merdeka-legacy"
                        label={`Sort by ${column.label.toLowerCase()}`}
                        direction={getSortDirectionForField(column.field)}
                        onClick={() => handleSort(column.field)}
                      />
                      {column.filter && (
                        <FilterPopover
                          label={`Filter ${column.label.toLowerCase()}`}
                          isActive={isFilterActive(column.filter)}
                          onClear={() => clearFilter(column.filter!)}
                        >
                          {textFilters.includes(column.filter) ? (
                            <>
                              <Label htmlFor={`filter-${column.filter}`}>
                                Filter by {column.label.toLowerCase()}
                              </Label>
                              <Input
                                id={`filter-${column.filter}`}
                                placeholder="Type to filter…"
                                value={filters[column.filter]}
                                onChange={(event) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    [column.filter!]: event.target.value,
                                  }))
                                }
                              />
                            </>
                          ) : (
                            <>
                              <Label>
                                Filter by {column.label.toLowerCase()}
                              </Label>
                              <RadioGroup
                                value={filters[column.filter]}
                                onValueChange={(value) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    [column.filter!]: value,
                                  }))
                                }
                              >
                                {(column.filter === 'license'
                                  ? licenseTypes.map((value) => [value, value])
                                  : progressOptions
                                ).map(([value, label]) => (
                                  <div
                                    className="flex items-center gap-2"
                                    key={value}
                                  >
                                    <RadioGroupItem
                                      value={value}
                                      id={`filter-${column.filter}-${value}`}
                                    />
                                    <Label
                                      htmlFor={`filter-${column.filter}-${value}`}
                                    >
                                      {label}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </>
                          )}
                        </FilterPopover>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="employee-actions">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageHires.map((hire) => (
                <TableRow
                  key={hire.id}
                  data-state={isSelected(hire.id!) ? 'selected' : undefined}
                >
                  <TableCell>
                    <Checkbox
                      className="merdeka-legacy"
                      checked={isSelected(hire.id!)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(hire.id!, checked === true)
                      }
                      aria-label={`Select ${hire.name}`}
                      disabled={busy}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="employee-name">
                      <span className="employee-avatar" aria-hidden="true">
                        {hire.name
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join('')}
                      </span>
                      <div>
                        <button
                          className="merdeka-name-button"
                          onClick={() => {
                            setSelectedHireId(hire.id!);
                            setShowDetailModal(true);
                          }}
                        >
                          {hire.name}
                        </button>
                        <div className="employee-email">{hire.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{hire.title}</TableCell>
                  <TableCell>{hire.department}</TableCell>
                  <TableCell>{hire.email}</TableCell>
                  <TableCell>
                    {hire.on_site_date ? hire.on_site_date.slice(0, 10) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`merdeka-status ${hire.status_srf ? 'success' : 'pending'}`}
                    >
                      {hire.status_srf ? 'Received' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`merdeka-status ${['ready', 'done'].includes(hire.laptop_ready?.toLowerCase()) ? 'success' : 'pending'}`}
                    >
                      {hire.laptop_ready || 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`merdeka-status ${hire.account_creation_status === 'Active' ? 'success' : 'pending'}`}
                    >
                      {hire.account_creation_status || 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="merdeka-status">
                      {hire.microsoft_365_license || 'None'}
                    </span>
                  </TableCell>
                  <TableCell>{hire.ict_support_pic || 'Unassigned'}</TableCell>
                  <TableCell>
                    <ProgressBar
                      percentage={calculateProgressPercentage(hire)}
                      showText
                    />
                  </TableCell>
                  <TableCell className="employee-actions">
                    <div className="employee-row-actions">
                      <button
                        className="btn btn-outline-gray btn-sm"
                        aria-label={`View ${hire.name}`}
                        title="View details"
                        onClick={() => {
                          setSelectedHireId(hire.id!);
                          setShowDetailModal(true);
                        }}
                      >
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                      <button
                        className="btn btn-outline-gray btn-sm"
                        aria-label={`Edit ${hire.name}`}
                        title="Edit hire"
                        onClick={() => navigate(`/hires/${hire.id}`)}
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        className="btn btn-outline-gray btn-sm merdeka-delete"
                        aria-label={`Delete ${hire.name}`}
                        title="Delete hire"
                        disabled={busy}
                        onClick={() => handleDelete(hire.id!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!isLoading && !loadError && (
        <div className="employee-pagination">
          <nav className="merdeka-pages" aria-label="New hires pages">
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setCurrentPage(page - 1)}
            >
              ‹
            </button>
            {Array.from(
              new Set([
                1,
                ...Array.from({ length: 5 }, (_, i) => page - 2 + i).filter(
                  (value) => value >= 1 && value <= pageCount,
                ),
                pageCount,
              ]),
            )
              .sort((a, b) => a - b)
              .map((value, index, pages) => (
                <span key={value}>
                  {index > 0 && value - pages[index - 1] > 1 && (
                    <span className="merdeka-page-gap">…</span>
                  )}
                  <button
                    aria-label={`Page ${value}`}
                    aria-current={page === value ? 'page' : undefined}
                    onClick={() => setCurrentPage(value)}
                  >
                    {value}
                  </button>
                </span>
              ))}
            <button
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => setCurrentPage(page + 1)}
            >
              ›
            </button>
          </nav>
          <div className="merdeka-page-size">
            <span aria-live="polite">
              {sortedHires.length
                ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sortedHires.length)} of ${sortedHires.length}`
                : '0 records'}
            </span>
            <label htmlFor="hires-page-size">Show:</label>
            <select
              id="hires-page-size"
              className="form-select"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} Rows
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!isBulkDeleting && !isDeleting) {
            setShowDeleteDialog(open);
            if (!open) setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteId
                ? 'Delete new hire?'
                : 'Delete selected records?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              {pendingDeleteId
                ? hires.find((hire) => hire.id === pendingDeleteId)?.name ||
                  'this record'
                : `${selectedHires.length} selected records`}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void (pendingDeleteId
                  ? confirmSingleDelete()
                  : handleBulkDelete());
              }}
              disabled={busy}
            >
              {isDeleting || isBulkDeleting ? 'Deleting…' : 'Delete'}
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
      <HireDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        hireId={selectedHireId}
      />
    </div>
  );
}
