import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Grid,
  Avatar,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Edit,
  CheckCircle,
  Schedule,
  Error,
  Warning,
  Person,
  Business,
  Email,
  Phone,
  CalendarToday,
  Assignment
} from '@mui/icons-material';
import { NewHire } from '@/types/types';
import { calculateProgressPercentage } from '@/utils/progressCalculator';

interface WorkflowCardProps {
  hire: NewHire;
  onUpdate?: (hireId: string, updates: Partial<NewHire>) => void;
  onViewDetails?: (hireId: string) => void;
  compact?: boolean;
  showActions?: boolean;
}

interface QuickUpdateDialogProps {
  open: boolean;
  hire: NewHire;
  onClose: () => void;
  onSave: (updates: Partial<NewHire>) => void;
}

const QuickUpdateDialog: React.FC<QuickUpdateDialogProps> = ({
  open,
  hire,
  onClose,
  onSave
}) => {
  const [updates, setUpdates] = useState<Partial<NewHire>>({});

  const handleSave = () => {
    onSave(updates);
    onClose();
    setUpdates({});
  };

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  const laptopOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Done', label: 'Done' }
  ];

  const licenseOptions = [
    { value: 'None', label: 'None' },
    { value: 'Microsoft 365 Business Basic', label: 'M365 Business Basic' },
    { value: 'Microsoft 365 Business Standard', label: 'M365 Business Standard' },
    { value: 'Microsoft 365 Business Premium', label: 'M365 Business Premium' },
    { value: 'Office 365 E3', label: 'Office 365 E3' },
    { value: 'Office 365 E5', label: 'Office 365 E5' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quick Update - {hire.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Account Status</InputLabel>
            <Select
              value={updates.account_creation_status ?? hire.account_creation_status}
              label="Account Status"
              onChange={(e) => setUpdates(prev => ({ ...prev, account_creation_status: e.target.value }))}
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Laptop Status</InputLabel>
            <Select
              value={updates.laptop_ready ?? hire.laptop_ready}
              label="Laptop Status"
              onChange={(e) => setUpdates(prev => ({ ...prev, laptop_ready: e.target.value }))}
            >
              {laptopOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Microsoft 365 License</InputLabel>
            <Select
              value={updates.microsoft_365_license ?? hire.microsoft_365_license}
              label="Microsoft 365 License"
              onChange={(e) => setUpdates(prev => ({ ...prev, microsoft_365_license: e.target.value }))}
            >
              {licenseOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={updates.note ?? hire.note}
            onChange={(e) => setUpdates(prev => ({ ...prev, note: e.target.value }))}
            placeholder="Add any additional notes..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  hire,
  onUpdate,
  onViewDetails,
  compact = false,
  showActions = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(false);
  const [quickUpdateOpen, setQuickUpdateOpen] = useState(false);

  const progress = calculateProgressPercentage(hire);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'done':
      case 'synced':
        return 'success';
      case 'pending':
      case 'in progress':
      case 'partial':
        return 'warning';
      case 'inactive':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'done':
      case 'synced':
        return <CheckCircle color="success" fontSize="small" />;
      case 'pending':
      case 'in progress':
      case 'partial':
        return <Schedule color="warning" fontSize="small" />;
      case 'inactive':
      case 'failed':
        return <Error color="error" fontSize="small" />;
      default:
        return <Warning color="disabled" fontSize="small" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const handleQuickUpdate = (updates: Partial<NewHire>) => {
    if (onUpdate && hire.id) {
      onUpdate(hire.id, updates);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  if (compact) {
    return (
      <Card 
        elevation={1} 
        sx={{ 
          cursor: onViewDetails ? 'pointer' : 'default',
          '&:hover': onViewDetails ? { elevation: 3 } : {}
        }}
        onClick={() => onViewDetails?.(hire.id!)}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              {hire.name.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                {hire.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {hire.title} • {hire.department}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={`${progress}%`}
                color={getProgressColor(progress) as any}
              />
              {showActions && (
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickUpdateOpen(true);
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card elevation={2}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              {hire.name.charAt(0).toUpperCase()}
            </Avatar>
          }
          title={
            <Typography variant="h6" component="h3">
              {hire.name}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {hire.title} • {hire.department}
              </Typography>
              <Chip
                size="small"
                label={`${progress}% Complete`}
                color={getProgressColor(progress) as any}
              />
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showActions && (
                <>
                  <IconButton onClick={() => setQuickUpdateOpen(true)}>
                    <Edit />
                  </IconButton>
                  {onViewDetails && (
                    <Button
                      size="small"
                      onClick={() => onViewDetails(hire.id!)}
                    >
                      View Details
                    </Button>
                  )}
                </>
              )}
              <IconButton onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          }
        />

        <CardContent sx={{ pt: 0 }}>
          {/* Quick Status Overview */}
grid, use this example          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(hire.account_creation_status)}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Account
                  </Typography>
                  <Typography variant="body2">
                    {hire.account_creation_status || 'Pending'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(hire.laptop_ready)}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Laptop
                  </Typography>
                  <Typography variant="body2">
                    {hire.laptop_ready || 'Pending'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(hire.license_assigned ? 'active' : 'pending')}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    License
                  </Typography>
                  <Typography variant="body2">
                    {hire.license_assigned ? 'Assigned' : 'Pending'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(hire.status_srf ? 'active' : 'pending')}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    SRF
                  </Typography>
                  <Typography variant="body2">
                    {hire.status_srf ? 'Complete' : 'Pending'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Collapse in={expanded}>
            <Divider sx={{ mb: 2 }} />
            
            {/* Detailed Information */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Contact Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">{hire.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">{hire.phone_number || 'Not provided'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2">{hire.direct_report || 'Not assigned'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Timeline
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">
                      Start Date: {formatDate(hire.start_date || hire.on_site_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment fontSize="small" color="action" />
                    <Typography variant="body2">
                      Created: {formatDate(hire.created_at!)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Additional Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Position Grade:</strong> {hire.position_grade || 'Not specified'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Microsoft 365 License:</strong> {hire.microsoft_365_license || 'None'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Distribution Lists:</strong> {
                      hire.distribution_list_sync_status || 'Not synced'
                    }
                  </Typography>
                  {hire.note && (
                    <Typography variant="body2">
                      <strong>Notes:</strong> {hire.note}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      <QuickUpdateDialog
        open={quickUpdateOpen}
        hire={hire}
        onClose={() => setQuickUpdateOpen(false)}
        onSave={handleQuickUpdate}
      />
    </>
  );
};

export default WorkflowCard;