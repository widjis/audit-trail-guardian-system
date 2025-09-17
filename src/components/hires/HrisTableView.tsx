import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Toolbar,
  Typography,
  Checkbox,
  Menu,
  ListItemText,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Alert,
  AlertTitle,
  Collapse
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Search,
  FilterList,
  GetApp,
  Refresh,
  MoreVert,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  Warning,
  Info,
  Visibility,
  Edit,
  Delete,
  CloudDownload
} from '@mui/icons-material';
import { useToast } from '@/hooks/use-toast';
import { HrisSyncResult } from '@/types/types';

interface HrisTableViewProps {
  data?: HrisSyncResult[];
  loading?: boolean;
  onRefresh?: () => void;
  onSync?: (selectedIds: string[]) => void;
}

interface FilterState {
  search: string;
  department: string;
  syncStatus: string;
  issueType: string;
  matchScore: string;
}

const INITIAL_FILTERS: FilterState = {
  search: '',
  department: '',
  syncStatus: '',
  issueType: '',
  matchScore: ''
};

const SYNC_STATUS_OPTIONS = [
  { value: 'in-sync', label: 'In Sync', color: 'success' },
  { value: 'needs-update', label: 'Needs Update', color: 'warning' },
  { value: 'high-priority', label: 'High Priority', color: 'error' },
  { value: 'no-match', label: 'No AD Match', color: 'default' }
];

const MATCH_SCORE_OPTIONS = [
  { value: 'excellent', label: 'Excellent (≤0.2)', range: [0, 0.2] },
  { value: 'good', label: 'Good (0.2-0.4)', range: [0.2, 0.4] },
  { value: 'poor', label: 'Poor (>0.4)', range: [0.4, 1] }
];

export const HrisTableView: React.FC<HrisTableViewProps> = ({
  data = [],
  loading = false,
  onRefresh,
  onSync
}) => {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { toast } = useToast();

  // Get unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set(data.map(row => {
      return row.diffs?.department || 
             row.fieldComparison?.details?.department?.adValue || 
             row.fieldComparison?.details?.department?.hrisValue || 
             'Unknown';
    }).filter(Boolean));
    return Array.from(depts).sort();
  }, [data]);

  // Filter and search logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          row.employeeID,
          row.displayName,
          row.diffs?.department,
          row.diffs?.title,
          row.fieldComparison?.details?.department?.adValue,
          row.fieldComparison?.details?.title?.adValue
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }

      // Department filter
      if (filters.department) {
        const dept = row.diffs?.department || row.fieldComparison?.details?.department?.adValue || 'Unknown';
        if (dept !== filters.department) return false;
      }

      // Sync status filter
      if (filters.syncStatus) {
        const hasChanges = Object.values(row.diffs || {}).some(v => v !== undefined && v !== null);
        const hasHighPriority = row.fieldComparison?.highPriorityIssues?.length > 0;
        const hasNoMatch = row.fuzzyScore === undefined || row.fuzzyScore === null;
        
        switch (filters.syncStatus) {
          case 'in-sync':
            if (hasChanges || hasHighPriority) return false;
            break;
          case 'needs-update':
            if (!hasChanges || hasHighPriority) return false;
            break;
          case 'high-priority':
            if (!hasHighPriority) return false;
            break;
          case 'no-match':
            if (!hasNoMatch) return false;
            break;
        }
      }

      // Match score filter
      if (filters.matchScore && row.fuzzyScore !== undefined && row.fuzzyScore !== null) {
        const option = MATCH_SCORE_OPTIONS.find(opt => opt.value === filters.matchScore);
        if (option) {
          const [min, max] = option.range;
          if (row.fuzzyScore < min || row.fuzzyScore > max) return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? paginatedData.map(row => row.employeeID) : []);
  };

  const handleSelectRow = (employeeID: string, checked: boolean) => {
    setSelectedRows(prev => 
      checked 
        ? [...prev, employeeID]
        : prev.filter(id => id !== employeeID)
    );
  };

  // Export functionality
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const exportData = selectedRows.length > 0 
        ? filteredData.filter(row => selectedRows.includes(row.employeeID))
        : filteredData;

      const csvContent = [
        // Header
        ['Employee ID', 'Display Name', 'Department', 'Title', 'Manager', 'Mobile', 'Match Score', 'Issues', 'Status'].join(','),
        // Data rows
        ...exportData.map(row => [
          row.employeeID,
          `"${row.displayName || ''}"`,
          `"${row.diffs?.department || row.fieldComparison?.details?.department?.adValue || ''}"`,
          `"${row.diffs?.title || row.fieldComparison?.details?.title?.adValue || ''}"`,
          `"${row.diffs?.manager || row.fieldComparison?.details?.manager?.adValue || ''}"`,
          `"${row.diffs?.mobile || row.fieldComparison?.details?.mobile?.adValue || ''}"`,
          row.fuzzyScore?.toFixed(3) || 'N/A',
          `"${row.fieldComparison?.highPriorityIssues?.join('; ') || ''}"`,
          getSyncStatus(row)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `hris-sync-data-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'Export completed',
        description: `${exportData.length} records exported to ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  // Helper functions
  const getSyncStatus = (row: HrisSyncResult) => {
    const hasChanges = Object.values(row.diffs || {}).some(v => v !== undefined && v !== null);
    const hasHighPriority = row.fieldComparison?.highPriorityIssues?.length > 0;
    
    if (hasHighPriority) return 'High Priority';
    if (hasChanges) return 'Needs Update';
    return 'In Sync';
  };

  const getSyncStatusColor = (row: HrisSyncResult) => {
    const status = getSyncStatus(row);
    switch (status) {
      case 'High Priority': return 'error';
      case 'Needs Update': return 'warning';
      default: return 'success';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score <= 0.2) return 'success';
    if (score <= 0.4) return 'warning';
    return 'error';
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Toolbar */}
      <Paper sx={{ mb: 2 }}>
        <Toolbar sx={{ pl: 2, pr: 1 }}>
          <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
            HRIS Data Table
            <Typography variant="body2" color="text.secondary">
              {filteredData.length} of {data.length} records
              {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
            </Typography>
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedRows.length > 0 && onSync && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => {
                  console.log('Sync Selected button clicked');
                  console.log('selectedRows:', selectedRows);
                  console.log('onSync function:', onSync);
                  onSync(selectedRows);
                }}
                size="small"
              >
                Sync Selected ({selectedRows.length})
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => handleExport('csv')}
              size="small"
            >
              Export CSV
            </Button>
            
            {onRefresh && (
              <IconButton onClick={onRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Paper>

      {/* Filters */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* Quick Filters */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {SYNC_STATUS_OPTIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  variant={filters.syncStatus === option.value ? 'filled' : 'outlined'}
                  color={option.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                  size="small"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    syncStatus: prev.syncStatus === option.value ? '' : option.value
                  }))}
                />
              ))}
            </Box>
          </Grid>

          {/* Advanced Filters Toggle */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                size="small"
                startIcon={<FilterList />}
                endIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                Filters
              </Button>
              {Object.values(filters).some(v => v !== '') && (
                <Button size="small" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Match Score</InputLabel>
                <Select
                  value={filters.matchScore}
                  label="Match Score"
                  onChange={(e) => setFilters(prev => ({ ...prev, matchScore: e.target.value }))}
                >
                  <MenuItem value="">All Scores</MenuItem>
                  {MATCH_SCORE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Data Table */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Match Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Issues</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>Loading HRIS data...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {data.length === 0 ? 'No HRIS data available' : 'No records match the current filters'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <React.Fragment key={row.employeeID}>
                    <TableRow hover selected={selectedRows.includes(row.employeeID)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.includes(row.employeeID)}
                          onChange={(e) => handleSelectRow(row.employeeID, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {row.employeeID}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.displayName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {row.diffs?.department ? (
                            <Chip
                              label={row.diffs.department}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2">
                              {row.fieldComparison?.details?.department?.adValue || '—'}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {row.diffs?.title ? (
                            <Chip
                              label={row.diffs.title}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2">
                              {row.fieldComparison?.details?.title?.adValue || '—'}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {row.fuzzyScore !== undefined && row.fuzzyScore !== null ? (
                          <Chip
                            label={row.fuzzyScore.toFixed(3)}
                            size="small"
                            color={getMatchScoreColor(row.fuzzyScore)}
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSyncStatus(row)}
                          size="small"
                          color={getSyncStatusColor(row)}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        {row.fieldComparison?.highPriorityIssues?.length > 0 ? (
                          <Tooltip title={row.fieldComparison.highPriorityIssues.join(', ')}>
                            <Chip
                              label={`${row.fieldComparison.highPriorityIssues.length} issue(s)`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedRow(
                            expandedRow === row.employeeID ? null : row.employeeID
                          )}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Details */}
                    {expandedRow === row.employeeID && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <Collapse in={expandedRow === row.employeeID}>
                            <Box sx={{ p: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                Detailed Comparison for {row.displayName}
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Card variant="outlined">
                                    <CardContent>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Current AD Values
                                      </Typography>
                                      <Typography variant="body2">Department: {row.fieldComparison?.details?.department?.adValue || 'N/A'}</Typography>
                                      <Typography variant="body2">Title: {row.fieldComparison?.details?.title?.adValue || 'N/A'}</Typography>
                                      <Typography variant="body2">Manager: {row.fieldComparison?.details?.manager?.adValue || 'N/A'}</Typography>
                                      <Typography variant="body2">Mobile: {row.fieldComparison?.details?.mobile?.adValue || 'N/A'}</Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Card variant="outlined">
                                    <CardContent>
                                      <Typography variant="subtitle2" gutterBottom>
                                        HRIS Values (Proposed Changes)
                                      </Typography>
                                      <Typography variant="body2">Department: {row.diffs?.department || 'No change'}</Typography>
                                      <Typography variant="body2">Title: {row.diffs?.title || 'No change'}</Typography>
                                      <Typography variant="body2">Manager: {row.diffs?.manager || 'No change'}</Typography>
                                      <Typography variant="body2">Mobile: {row.diffs?.mobile || 'No change'}</Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              </Grid>
                              {row.fieldComparison?.highPriorityIssues?.length > 0 && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                  <AlertTitle>High Priority Issues</AlertTitle>
                                  <ul>
                                    {row.fieldComparison.highPriorityIssues.map((issue, index) => (
                                      <li key={index}>{issue}</li>
                                    ))}
                                  </ul>
                                </Alert>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default HrisTableView;