import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  Alert,
  AlertTitle,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Edit,
  Save,
  Cancel,
  CheckCircle,
  Schedule,
  Error,
  Warning,
  Person,
  Business,
  Email,
  Phone,
  CalendarToday,
  Assignment,
  Computer,
  Security,
  CloudSync,
  Refresh,
  History
} from '@mui/icons-material';
import { NewHire, AuditLog } from '@/types/types';
import { calculateProgressPercentage } from '@/utils/progressCalculator';

interface WorkflowDetailsProps {
  hire: NewHire;
  auditLogs?: AuditLog[];
  onUpdate?: (updates: Partial<NewHire>) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

interface EditDialogProps {
  open: boolean;
  hire: NewHire;
  onClose: () => void;
  onSave: (updates: Partial<NewHire>) => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ open, hire, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<NewHire>>({});

  useEffect(() => {
    if (open) {
      setFormData({
        name: hire.name,
        email: hire.email,
        title: hire.title,
        department: hire.department,
        phone_number: hire.phone_number,
        direct_report: hire.direct_report,
        position_grade: hire.position_grade,
        start_date: hire.start_date,
        on_site_date: hire.on_site_date,
        account_creation_status: hire.account_creation_status,
        laptop_ready: hire.laptop_ready,
        microsoft_365_license: hire.microsoft_365_license,
        note: hire.note
      });
    }
  }, [open, hire]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Failed', label: 'Failed' }
  ];

  const laptopOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Done', label: 'Done' },
    { value: 'Failed', label: 'Failed' }
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Hire Details - {hire.name}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Job Title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone_number || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Direct Report"
              value={formData.direct_report || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, direct_report: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Position Grade"
              value={formData.position_grade || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, position_grade: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Account Status</InputLabel>
              <Select
                value={formData.account_creation_status || ''}
                label="Account Status"
                onChange={(e) => setFormData(prev => ({ ...prev, account_creation_status: e.target.value }))}
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Laptop Status</InputLabel>
              <Select
                value={formData.laptop_ready || ''}
                label="Laptop Status"
                onChange={(e) => setFormData(prev => ({ ...prev, laptop_ready: e.target.value }))}
              >
                {laptopOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Microsoft 365 License</InputLabel>
              <Select
                value={formData.microsoft_365_license || ''}
                label="Microsoft 365 License"
                onChange={(e) => setFormData(prev => ({ ...prev, microsoft_365_license: e.target.value }))}
              >
                {licenseOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={formData.note || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Add any additional notes or comments..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<Cancel />}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" startIcon={<Save />}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const WorkflowDetails: React.FC<WorkflowDetailsProps> = ({
  hire,
  auditLogs = [],
  onUpdate,
  onRefresh,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
        return <CheckCircle color="success" />;
      case 'pending':
      case 'in progress':
      case 'partial':
        return <Schedule color="warning" />;
      case 'inactive':
      case 'failed':
        return <Error color="error" />;
      default:
        return <Warning color="disabled" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const handleUpdate = (updates: Partial<NewHire>) => {
    if (onUpdate) {
      onUpdate(updates);
    }
  };

  const workflowSteps = [
    {
      label: 'Account Creation',
      status: hire.account_creation_status,
      icon: <Person />,
      description: 'User account setup and permissions'
    },
    {
      label: 'Laptop Setup',
      status: hire.laptop_ready,
      icon: <Computer />,
      description: 'Hardware preparation and configuration'
    },
    {
      label: 'License Assignment',
      status: hire.license_assigned ? 'Active' : 'Pending',
      icon: <Security />,
      description: 'Software licenses and access rights'
    },
    {
      label: 'SRF Documentation',
      status: hire.status_srf ? 'Complete' : 'Pending',
      icon: <Assignment />,
      description: 'Service request form processing'
    },
    {
      label: 'Microsoft 365',
      status: hire.microsoft_365_license ? 'Assigned' : 'Pending',
      icon: <CloudSync />,
      description: 'Office 365 setup and configuration'
    },
    {
      label: 'Distribution Lists',
      status: hire.distribution_list_sync_status || 'Pending',
      icon: <Email />,
      description: 'Email groups and communication setup'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56 }}>
            {hire.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {hire.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {hire.title} • {hire.department}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={`${progress}% Complete`}
                color={getProgressColor(progress) as any}
                size="small"
              />
              <LinearProgress
                variant="determinate"
                value={progress}
                color={getProgressColor(progress) as any}
                sx={{ width: 200, ml: 1 }}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onRefresh && (
            <Tooltip title="Refresh Data">
              <IconButton onClick={onRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
          {onUpdate && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditDialogOpen(true)}
              disabled={loading}
            >
              Edit Details
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Contact Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Email color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{hire.email}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Phone color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {hire.phone_number || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Person color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Direct Report
                    </Typography>
                    <Typography variant="body1">
                      {hire.direct_report || 'Not assigned'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Business color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Position Grade
                    </Typography>
                    <Typography variant="body1">
                      {hire.position_grade || 'Not specified'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Timeline
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarToday color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Start Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(hire.start_date || hire.on_site_date)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Assignment color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(hire.created_at!)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <History color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(hire.updated_at!)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow Progress */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Progress
              </Typography>
              <Timeline position={isMobile ? 'right' : 'alternate'}>
                {workflowSteps.map((step, index) => (
                  <TimelineItem key={index}>
                    <TimelineOppositeContent
                      sx={{ m: 'auto 0' }}
                      align={index % 2 === 0 ? 'right' : 'left'}
                      variant="body2"
                      color="text.secondary"
                    >
                      {step.description}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={getStatusColor(step.status) as any}>
                        {step.icon}
                      </TimelineDot>
                      {index < workflowSteps.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Typography variant="h6" component="span">
                        {step.label}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        {getStatusIcon(step.status)}
                        <Chip
                          size="small"
                          label={step.status || 'Pending'}
                          color={getStatusColor(step.status) as any}
                        />
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Details */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Additional Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Microsoft 365 License
                  </Typography>
                  <Typography variant="body1">
                    {hire.microsoft_365_license || 'None assigned'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Distribution List Status
                  </Typography>
                  <Typography variant="body1">
                    {hire.distribution_list_sync_status || 'Not synced'}
                  </Typography>
                </Grid>
                {hire.note && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {hire.note}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Audit Logs */}
        {auditLogs.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {auditLogs.slice(0, 10).map((log, index) => (
                    <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < 9 ? 1 : 0, borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(log.timestamp)}
                      </Typography>
                      <Typography variant="body1">
                        {log.action}
                      </Typography>
                      {log.message && (
                        <Typography variant="body2" color="text.secondary">
                          {log.message}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Edit Dialog */}
      <EditDialog
        open={editDialogOpen}
        hire={hire}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleUpdate}
      />
    </Box>
  );
};

export default WorkflowDetails;