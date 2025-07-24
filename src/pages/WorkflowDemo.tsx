import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Dashboard,
  Assignment,
  Settings,
  Timeline,
  ViewList
} from '@mui/icons-material';
import {
  WorkflowStepper,
  WorkflowCard,
  WorkflowDashboard,
  WorkflowDetails,
  WorkflowManager
} from '@/components/workflow';
import { NewHire } from '@/types/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `workflow-tab-${index}`,
    'aria-controls': `workflow-tabpanel-${index}`,
  };
}

// Mock data for demonstration
const mockHires: NewHire[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    title: 'Software Engineer',
    department: 'Engineering',
    phone_number: '+1-555-0123',
    direct_report: 'Jane Doe',
    position_grade: 'L3',
    start_date: '2024-02-01',
    on_site_date: '2024-02-01',
    account_creation_status: 'Active',
    laptop_ready: 'Done',
    license_assigned: true,
    status_srf: true,
    microsoft_365_license: 'Microsoft 365 Business Premium',
    distribution_list_sync_status: 'Synced',
    note: 'Standard onboarding completed successfully',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    mailing_list: ['engineering@company.com', 'all-staff@company.com'],
    remarks: 'Experienced developer with React expertise',
    username: 'jsmith',
    password: 'TempPass123!'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    title: 'Product Manager',
    department: 'Product',
    phone_number: '+1-555-0124',
    direct_report: 'Mike Wilson',
    position_grade: 'L4',
    start_date: '2024-02-15',
    on_site_date: '2024-02-15',
    account_creation_status: 'Active',
    laptop_ready: 'In Progress',
    license_assigned: false,
    status_srf: false,
    microsoft_365_license: 'Office 365 E3',
    distribution_list_sync_status: 'Partial',
    note: 'Waiting for laptop delivery',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-25T11:15:00Z',
    mailing_list: ['product@company.com', 'managers@company.com'],
    remarks: 'Senior PM with 5+ years experience in SaaS products',
    username: 'sjohnson',
    password: 'TempPass456!'
  },
  {
    id: '3',
    name: 'David Chen',
    email: 'david.chen@company.com',
    title: 'Data Analyst',
    department: 'Analytics',
    phone_number: '+1-555-0125',
    direct_report: 'Lisa Park',
    position_grade: 'L2',
    start_date: '2024-03-01',
    on_site_date: '2024-03-01',
    account_creation_status: 'Pending',
    laptop_ready: 'Pending',
    license_assigned: false,
    status_srf: false,
    microsoft_365_license: 'None',
    distribution_list_sync_status: 'Failed',
    note: 'New hire starting next month',
    created_at: '2024-01-25T14:00:00Z',
    updated_at: '2024-01-25T14:00:00Z',
    mailing_list: ['analytics@company.com', 'data-team@company.com'],
    remarks: 'Fresh graduate with strong analytical skills',
    username: 'dchen',
    password: 'TempPass789!'
  }
];

export const WorkflowDemo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedHire, setSelectedHire] = useState<NewHire>(mockHires[0]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUpdateHire = (hireId: string, updates: Partial<NewHire>) => {
    console.log('Updating hire:', hireId, updates);
    // In real implementation, this would update the hire data
  };

  const handleViewHireDetails = (hireId: string) => {
    const hire = mockHires.find(h => h.id === hireId);
    if (hire) {
      setSelectedHire(hire);
      setTabValue(3); // Switch to details tab
    }
  };

  const handleCreateWorkflow = (templateId: string, hireId: string) => {
    console.log('Creating workflow:', templateId, hireId);
    // In real implementation, this would create a new workflow instance
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        Enhanced Workflow Components Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Workflow Management System</AlertTitle>
        This demo showcases the enhanced workflow components built with Material UI. 
        Navigate through the tabs to explore different aspects of the workflow system.
      </Alert>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="workflow demo tabs">
            <Tab 
              label="Dashboard" 
              icon={<Dashboard />} 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label="Stepper View" 
              icon={<Timeline />} 
              iconPosition="start"
              {...a11yProps(1)} 
            />
            <Tab 
              label="Card View" 
              icon={<ViewList />} 
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              label="Details" 
              icon={<Assignment />} 
              iconPosition="start"
              {...a11yProps(3)} 
            />
            <Tab 
              label="Manager" 
              icon={<Settings />} 
              iconPosition="start"
              {...a11yProps(4)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" gutterBottom>
            Workflow Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Complete dashboard with filtering, sorting, search, and statistics overview.
          </Typography>
          <WorkflowDashboard
            hires={mockHires}
            onUpdateHire={handleUpdateHire}
            onViewHireDetails={handleViewHireDetails}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom>
            Workflow Stepper
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Visual progress tracking with step-by-step workflow visualization.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {mockHires.map((hire) => (
              <Button
                key={hire.id}
                variant={selectedHire.id === hire.id ? 'contained' : 'outlined'}
                onClick={() => setSelectedHire(hire)}
              >
                {hire.name}
              </Button>
            ))}
          </Box>
          <WorkflowStepper hire={selectedHire} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom>
            Workflow Cards
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Individual workflow cards with quick actions and detailed information.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6">Expanded View</Typography>
            <WorkflowCard
              hire={selectedHire}
              onUpdate={handleUpdateHire}
              onViewDetails={handleViewHireDetails}
            />
            
            <Typography variant="h6" sx={{ mt: 3 }}>
              Compact View
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mockHires.map((hire) => (
                <WorkflowCard
                  key={hire.id}
                  hire={hire}
                  onUpdate={handleUpdateHire}
                  onViewDetails={handleViewHireDetails}
                  compact
                />
              ))}
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom>
            Workflow Details
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Comprehensive details view with timeline, contact information, and edit capabilities.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {mockHires.map((hire) => (
              <Button
                key={hire.id}
                variant={selectedHire.id === hire.id ? 'contained' : 'outlined'}
                onClick={() => setSelectedHire(hire)}
              >
                {hire.name}
              </Button>
            ))}
          </Box>
          <WorkflowDetails
            hire={selectedHire}
            onUpdate={(updates) => handleUpdateHire(selectedHire.id!, updates)}
            onRefresh={() => console.log('Refreshing data...')}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h5" gutterBottom>
            Workflow Manager
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Template management and workflow orchestration system.
          </Typography>
          <WorkflowManager
            hires={mockHires}
            onCreateWorkflow={handleCreateWorkflow}
            onUpdateWorkflow={(workflowId, updates) => console.log('Updating workflow:', workflowId, updates)}
            onDeleteWorkflow={(workflowId) => console.log('Deleting workflow:', workflowId)}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default WorkflowDemo;