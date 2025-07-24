import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Slider,
  TextField,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Search as SearchIcon
} from '@mui/icons-material';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  gender: string;
}

interface FuzzyMatch {
  displayName: string;
  name: string;
  employeeID: string;
  confidence: number;
  score: number;
}

interface FuzzyMatching {
  threshold: number;
  bestMatch: FuzzyMatch | null;
  confidence: number;
  method: string;
  allMatches: FuzzyMatch[];
}

interface EmployeeNotInAd {
  employee: Employee;
  fuzzyMatching: FuzzyMatching;
  recommendations: Array<{
    type: string;
    message: string;
    action: string;
    severity: string;
  }>;
}

interface DebugResponse {
  success: boolean;
  data: {
    employeesNotInAd: EmployeeNotInAd[];
    summary: {
      totalHrisEmployees: number;
      totalAdUsers: number;
      employeesNotFoundInAd: number;
      employeesWithFuzzyMatches: number;
      employeesWithHighConfidenceMatches: number;
      employeesWithMediumConfidenceMatches: number;
      employeesWithLowConfidenceMatches: number;
      averageConfidence: number;
    };
    analysis: {
      thresholdInfo: {
        current: number;
        recommended: number;
        description: string;
      };
      confidenceGuide: {
        high: string;
        medium: string;
        low: string;
        veryLow: string;
      };
    };
  };
  timestamp: string;
}

export default function EmployeesNotInAdDebugger() {
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.4);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async (customThreshold?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const thresholdParam = customThreshold !== undefined ? customThreshold : threshold;
      const response = await fetch(`/api/hris-sync/debug-employees-not-in-ad?threshold=${thresholdParam}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching employees not in AD:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setThreshold(value);
  };

  const handleApplyThreshold = () => {
    fetchData(threshold);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    if (confidence >= 40) return 'error';
    return 'default';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const filteredEmployees = data?.data?.employeesNotInAd?.filter(item =>
    item?.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.employee?.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Analyzing employees not found in Active Directory...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={() => fetchData()}>
          Retry
        </Button>
      }>
        Error loading data: {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No data available. Click refresh to load employees not found in AD.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header and Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Employees Not Found in Active Directory
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchData()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Not Found in AD
              </Typography>
              <Typography variant="h4">
                {data?.data?.summary?.employeesNotFoundInAd || 0}
              </Typography>
              <Typography variant="body2">
                of {data?.data?.summary?.totalHrisEmployees || 0} HRIS employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                With Fuzzy Matches
              </Typography>
              <Typography variant="h4">
                {data?.data?.summary?.employeesWithFuzzyMatches || 0}
              </Typography>
              <Typography variant="body2">
                have potential matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High Confidence
              </Typography>
              <Typography variant="h4" color="success.main">
                {data?.data?.summary?.employeesWithHighConfidenceMatches || 0}
              </Typography>
              <Typography variant="body2">
                ≥80% confidence
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Confidence
              </Typography>
              <Typography variant="h4">
                {data?.data?.summary?.averageConfidence?.toFixed(1) || '0.0'}%
              </Typography>
              <Typography variant="body2">
                across all matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threshold Control */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Fuzzy Matching Threshold
            <Tooltip title={data?.data?.analysis?.thresholdInfo?.description || 'Threshold configuration'}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>
                Current: {threshold.toFixed(2)} (Recommended: {data?.data?.analysis?.thresholdInfo?.recommended || '0.4'})
              </Typography>
              <Slider
                value={threshold}
                onChange={handleThresholdChange}
                min={0.1}
                max={0.8}
                step={0.05}
                marks={[
                  { value: 0.2, label: '0.2 (Strict)' },
                  { value: 0.4, label: '0.4 (Default)' },
                  { value: 0.6, label: '0.6 (Lenient)' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Threshold"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0.4)}
                inputProps={{ min: 0.1, max: 0.8, step: 0.05 }}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant="contained"
                onClick={handleApplyThreshold}
                disabled={loading}
                fullWidth
              >
                Apply Threshold
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Search */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="Search by name, employee ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      {/* Confidence Guide */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Confidence Level Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="success.main">
                <strong>High (80-100%):</strong> {data?.data?.analysis?.confidenceGuide?.high || 'Very likely matches'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="warning.main">
                <strong>Medium (60-79%):</strong> {data?.data?.analysis?.confidenceGuide?.medium || 'Probable matches'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="error.main">
                <strong>Low (40-59%):</strong> {data?.data?.analysis?.confidenceGuide?.low || 'Possible matches'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Very Low (0-39%):</strong> {data?.data?.analysis?.confidenceGuide?.veryLow || 'Unlikely matches'}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Best Match</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Recommendations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((item, index) => (
              <TableRow key={item?.employee?.id || index} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item?.employee?.name || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item?.employee?.id || 'N/A'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{item?.employee?.department || 'N/A'}</TableCell>
                <TableCell>{item?.employee?.position || 'N/A'}</TableCell>
                <TableCell>
                  {item?.fuzzyMatching?.bestMatch ? (
                    <Box>
                      <Typography variant="body2">
                        {item.fuzzyMatching.bestMatch.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.fuzzyMatching.bestMatch.employeeID}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No match found
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${item?.fuzzyMatching?.confidence?.toFixed(1) || '0.0'}%`}
                    color={getConfidenceColor(item?.fuzzyMatching?.confidence || 0)}
                    size="small"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    {getConfidenceLabel(item?.fuzzyMatching?.confidence || 0)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item?.fuzzyMatching?.method?.replace('_', ' ') || 'unknown'}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    {(item?.recommendations || []).slice(0, 2).map((rec, recIndex) => (
                      <Chip
                        key={recIndex}
                        label={rec?.type?.replace('_', ' ') || 'unknown'}
                        color={getSeverityColor(rec?.severity || 'default')}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {(item?.recommendations?.length || 0) > 2 && (
                      <Badge badgeContent={(item?.recommendations?.length || 0) - 2} color="primary">
                        <Chip label="..." size="small" />
                      </Badge>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredEmployees.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm ? 'No employees match your search criteria.' : 'No employees found that are not in Active Directory.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}