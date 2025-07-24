import React from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  AccountCircle,
  Computer,
  Assignment,
  Description,
  Microsoft,
  Group,
  CheckCircle,
  Schedule,
  Error,
  Warning
} from '@mui/icons-material';
import { NewHire } from '@/types/types';
import { calculateProgressPercentage } from '@/utils/progressCalculator';

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'in-progress' | 'pending' | 'error';
  progress?: number;
  details?: string;
  estimatedTime?: string;
}

interface WorkflowStepperProps {
  hire: NewHire;
  variant?: 'horizontal' | 'vertical';
  showProgress?: boolean;
  onStepClick?: (stepId: string) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  hire,
  variant = 'vertical',
  showProgress = true,
  onStepClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Force vertical on mobile
  const actualVariant = isMobile ? 'vertical' : variant;

  const getStepStatus = (stepId: string): 'completed' | 'in-progress' | 'pending' | 'error' => {
    switch (stepId) {
      case 'account':
        if (hire.account_creation_status === 'Active') return 'completed';
        if (hire.account_creation_status === 'Pending') return 'in-progress';
        if (hire.account_creation_status === 'Inactive') return 'error';
        return 'pending';
      
      case 'laptop':
        const laptopStatus = hire.laptop_ready?.toLowerCase();
        if (laptopStatus === 'done') return 'completed';
        if (laptopStatus === 'ready' || laptopStatus === 'in progress') return 'in-progress';
        return 'pending';
      
      case 'license':
        return hire.license_assigned ? 'completed' : 'pending';
      
      case 'srf':
        return hire.status_srf ? 'completed' : 'pending';
      
      case 'microsoft365':
        return hire.microsoft_365_license && hire.microsoft_365_license !== 'None' ? 'completed' : 'pending';
      
      case 'distribution':
        if (hire.distribution_list_sync_status === 'Synced') return 'completed';
        if (hire.distribution_list_sync_status === 'Partial') return 'in-progress';
        if (hire.distribution_list_sync_status === 'Failed') return 'error';
        return 'pending';
      
      default:
        return 'pending';
    }
  };

  const getStepProgress = (stepId: string): number => {
    switch (stepId) {
      case 'laptop':
        const laptopStatus = hire.laptop_ready?.toLowerCase();
        if (laptopStatus === 'done') return 100;
        if (laptopStatus === 'ready') return 75;
        if (laptopStatus === 'in progress') return 50;
        if (laptopStatus === 'pending') return 25;
        return 0;
      
      case 'distribution':
        if (hire.distribution_list_sync_status === 'Synced') return 100;
        if (hire.distribution_list_sync_status === 'Partial') return 50;
        return 0;
      
      default:
        const status = getStepStatus(stepId);
        return status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0;
    }
  };

  const steps: WorkflowStep[] = [
    {
      id: 'account',
      label: 'Account Creation',
      description: 'Create Active Directory account and set up basic permissions',
      icon: <AccountCircle />,
      status: getStepStatus('account'),
      progress: getStepProgress('account'),
      details: `Status: ${hire.account_creation_status || 'Not Started'}`,
      estimatedTime: '1-2 hours'
    },
    {
      id: 'laptop',
      label: 'Laptop Setup',
      description: 'Prepare and configure laptop with required software',
      icon: <Computer />,
      status: getStepStatus('laptop'),
      progress: getStepProgress('laptop'),
      details: `Status: ${hire.laptop_ready || 'Not Started'}`,
      estimatedTime: '2-4 hours'
    },
    {
      id: 'license',
      label: 'License Assignment',
      description: 'Assign necessary software licenses and permissions',
      icon: <Assignment />,
      status: getStepStatus('license'),
      progress: getStepProgress('license'),
      details: hire.license_assigned ? 'Assigned' : 'Pending Assignment',
      estimatedTime: '30 minutes'
    },
    {
      id: 'srf',
      label: 'SRF Documentation',
      description: 'Complete and process Service Request Form',
      icon: <Description />,
      status: getStepStatus('srf'),
      progress: getStepProgress('srf'),
      details: hire.status_srf ? 'Completed' : 'Pending Completion',
      estimatedTime: '1 hour'
    },
    {
      id: 'microsoft365',
      label: 'Microsoft 365',
      description: 'Set up Microsoft 365 account and assign licenses',
      icon: <Microsoft />,
      status: getStepStatus('microsoft365'),
      progress: getStepProgress('microsoft365'),
      details: hire.microsoft_365_license || 'No License Assigned',
      estimatedTime: '45 minutes'
    },
    {
      id: 'distribution',
      label: 'Distribution Lists',
      description: 'Add to relevant distribution lists and groups',
      icon: <Group />,
      status: getStepStatus('distribution'),
      progress: getStepProgress('distribution'),
      details: hire.distribution_list_sync_status || 'Not Synced',
      estimatedTime: '15 minutes'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'in-progress':
        return <Schedule color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Warning color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const activeStep = steps.findIndex(step => step.status === 'in-progress');
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalProgress = calculateProgressPercentage(hire);

  if (actualVariant === 'horizontal') {
    return (
      <Card elevation={2}>
        <CardContent>
          {showProgress && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" component="h3">
                  Onboarding Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {completedSteps}/{steps.length} steps completed
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={totalProgress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {totalProgress}% Complete
              </Typography>
            </Box>
          )}
          
          <Stepper activeStep={activeStep} orientation="horizontal" alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.id} completed={step.status === 'completed'}>
                <StepLabel
                  error={step.status === 'error'}
                  icon={step.icon}
                  onClick={() => onStepClick?.(step.id)}
                  sx={{ cursor: onStepClick ? 'pointer' : 'default' }}
                >
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Chip
                    size="small"
                    label={step.details}
                    color={getStatusColor(step.status) as any}
                    sx={{ mt: 0.5 }}
                  />
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        {showProgress && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" component="h3">
                Onboarding Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completedSteps}/{steps.length} steps completed
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={totalProgress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {totalProgress}% Complete
            </Typography>
          </Box>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.id} completed={step.status === 'completed'}>
              <StepLabel
                error={step.status === 'error'}
                icon={step.icon}
                onClick={() => onStepClick?.(step.id)}
                sx={{ cursor: onStepClick ? 'pointer' : 'default' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {step.label}
                  </Typography>
                  {getStatusIcon(step.status)}
                </Box>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {step.description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={step.details}
                    color={getStatusColor(step.status) as any}
                  />
                  <Chip
                    size="small"
                    label={`Est. ${step.estimatedTime}`}
                    variant="outlined"
                  />
                </Box>

                {step.progress !== undefined && step.progress > 0 && step.progress < 100 && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={step.progress} 
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {step.progress}% complete
                    </Typography>
                  </Box>
                )}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
};

export default WorkflowStepper;