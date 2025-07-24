import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Pagination,
  Stack
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewList,
  ViewModule,
  Sort,
  TrendingUp,
  TrendingDown,
  Schedule,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { NewHire } from '@/types/types';
import { calculateProgressPercentage } from '@/utils/progressCalculator';
import { WorkflowCard } from './WorkflowCard';

interface WorkflowDashboardProps {
  hires: NewHire[];
  onUpdateHire?: (hireId: string, updates: Partial<NewHire>) => void;
  onViewHireDetails?: (hireId: string) => void;
  loading?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'progress' | 'start_date' | 'created_at' | 'department';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'issues';

interface FilterState {
  search: string;
  department: string;
  status: FilterStatus;
  sortField: SortField;
  sortDirection: SortDirection;
}

const ITEMS_PER_PAGE = 12;

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  hires,
  onUpdateHire,
  onViewHireDetails,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: '',
    status: 'all',
    sortField: 'created_at',
    sortDirection: 'desc'
  });

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = [...new Set(hires.map(hire => hire.department).filter(Boolean))];
    return depts.sort();
  }, [hires]);

  // Filter and sort hires
  const filteredAndSortedHires = useMemo(() => {
    let filtered = hires.filter(hire => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          hire.name.toLowerCase().includes(searchLower) ||
          hire.email.toLowerCase().includes(searchLower) ||
          hire.title?.toLowerCase().includes(searchLower) ||
          hire.department?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Department filter
      if (filters.department && hire.department !== filters.department) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const progress = calculateProgressPercentage(hire);
        switch (filters.status) {
          case 'pending':
            return progress < 25;
          case 'in_progress':
            return progress >= 25 && progress < 90;
          case 'completed':
            return progress >= 90;
          case 'issues':
            return hire.account_creation_status === 'Failed' ||
                   hire.laptop_ready === 'Failed' ||
                   hire.distribution_list_sync_status === 'Failed';
          default:
            return true;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'progress':
          aValue = calculateProgressPercentage(a);
          bValue = calculateProgressPercentage(b);
          break;
        case 'start_date':
          aValue = new Date(a.start_date || a.on_site_date || '1970-01-01');
          bValue = new Date(b.start_date || b.on_site_date || '1970-01-01');
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '1970-01-01');
          bValue = new Date(b.created_at || '1970-01-01');
          break;
        case 'department':
          aValue = (a.department || '').toLowerCase();
          bValue = (b.department || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [hires, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedHires.length / ITEMS_PER_PAGE);
  const paginatedHires = filteredAndSortedHires.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Statistics
  const stats = useMemo(() => {
    const total = hires.length;
    const completed = hires.filter(hire => calculateProgressPercentage(hire) >= 90).length;
    const inProgress = hires.filter(hire => {
      const progress = calculateProgressPercentage(hire);
      return progress >= 25 && progress < 90;
    }).length;
    const pending = hires.filter(hire => calculateProgressPercentage(hire) < 25).length;
    const issues = hires.filter(hire => 
      hire.account_creation_status === 'Failed' ||
      hire.laptop_ready === 'Failed' ||
      hire.distribution_list_sync_status === 'Failed'
    ).length;

    return { total, completed, inProgress, pending, issues };
  }, [hires]);

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSortChange = (field: SortField) => {
    if (filters.sortField === field) {
      handleFilterChange('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      handleFilterChange('sortField', field);
      handleFilterChange('sortDirection', 'asc');
    }
  };

  const getStatusColor = (status: FilterStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'issues': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: FilterStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle fontSize="small" />;
      case 'in_progress': return <TrendingUp fontSize="small" />;
      case 'pending': return <Schedule fontSize="small" />;
      case 'issues': return <Error fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Statistics */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Workflow Dashboard
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hires
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="success.main">
                  {stats.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="info.main">
                  {stats.inProgress}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="warning.main">
                  {stats.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="error.main">
                  {stats.issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filters and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search hires..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Department Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value as FilterStatus)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="issues">Issues</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortField}
                  label="Sort By"
                  onChange={(e) => handleSortChange(e.target.value as SortField)}
                >
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="progress">Progress</MenuItem>
                  <MenuItem value="start_date">Start Date</MenuItem>
                  <MenuItem value="created_at">Created Date</MenuItem>
                  <MenuItem value="department">Department</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* View Mode and Sort Direction */}
            <Grid size={{ xs: 12, sm: 12, md: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={filters.sortDirection === 'asc' ? <TrendingUp /> : <TrendingDown />}
                  onClick={() => handleFilterChange('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                  {filters.sortDirection === 'asc' ? 'Asc' : 'Desc'}
                </Button>
                
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <ViewModule />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewList />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>

          {/* Active Filters */}
          {(filters.search || filters.department || filters.status !== 'all') && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Active filters:
              </Typography>
              {filters.search && (
                <Chip
                  size="small"
                  label={`Search: ${filters.search}`}
                  onDelete={() => handleFilterChange('search', '')}
                />
              )}
              {filters.department && (
                <Chip
                  size="small"
                  label={`Department: ${filters.department}`}
                  onDelete={() => handleFilterChange('department', '')}
                />
              )}
              {filters.status !== 'all' && (
                <Chip
                  size="small"
                  label={`Status: ${filters.status}`}
                  color={getStatusColor(filters.status) as any}
                  icon={getStatusIcon(filters.status)}
                  onDelete={() => handleFilterChange('status', 'all')}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing {paginatedHires.length} of {filteredAndSortedHires.length} hires
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : paginatedHires.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No hires found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search criteria
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={viewMode === 'grid' ? 3 : 2}>
            {paginatedHires.map((hire) => (
              <Grid 
                size={{
                  xs: 12,
                  sm: viewMode === 'grid' ? 6 : 12,
                  md: viewMode === 'grid' ? 4 : 12,
                  lg: viewMode === 'grid' ? 3 : 12
                }}
                key={hire.id}
              >
                <WorkflowCard
                  hire={hire}
                  onUpdate={onUpdateHire}
                  onViewDetails={onViewHireDetails}
                  compact={viewMode === 'list'}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
      )}
    </Box>
  );
};

export default WorkflowDashboard;